import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import prisma from "@/lib/prisma";
import { deleteListingCompletely } from "@/lib/adminListings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DELETE_PER_RUN = 50;

function cutoff(days) {
  return new Date(Date.now() - Math.max(1, Number(days || 1)) * 24 * 60 * 60 * 1000);
}

export async function POST(req) {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status || 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode || "older_than_30_days").trim().toLowerCase();
    const deleteAll = mode === "all";
    const policies = {
      DRAFT: cutoff(process.env.INACTIVE_DRAFT_RETENTION_DAYS || 90),
      PENDING_REVIEW: cutoff(process.env.PENDING_REVIEW_RETENTION_DAYS || 45),
      REJECTED: cutoff(process.env.REJECTED_RETENTION_DAYS || 60),
      ARCHIVED: cutoff(process.env.ARCHIVED_LISTING_RETENTION_DAYS || 180),
      SOLD: cutoff(process.env.SOLD_LISTING_RETENTION_DAYS || process.env.ARCHIVED_LISTING_RETENTION_DAYS || 180),
      REMOVED: cutoff(process.env.REMOVED_LISTING_RETENTION_DAYS || 30),
    };

    const candidates = await prisma.listing.findMany({
      where: deleteAll
        ? {
            status: {
              not: "PUBLISHED",
            },
          }
        : {
            OR: [
              { status: "DRAFT", updatedAt: { lt: policies.DRAFT } },
              { status: "PENDING_REVIEW", updatedAt: { lt: policies.PENDING_REVIEW } },
              { status: "REJECTED", updatedAt: { lt: policies.REJECTED } },
              { status: "ARCHIVED", archivedAt: { not: null, lt: policies.ARCHIVED } },
              { status: "SOLD", archivedAt: { not: null, lt: policies.SOLD } },
              { status: "REMOVED", updatedAt: { lt: policies.REMOVED } },
            ],
          },
      orderBy: { updatedAt: "asc" },
      take: MAX_DELETE_PER_RUN,
      select: { id: true, status: true },
    });

    let deleted = 0;
    const byStatus = {};
    for (const candidate of candidates) {
      const result = await deleteListingCompletely(candidate.id);
      if (!result?.ok) continue;
      deleted += 1;
      byStatus[candidate.status] = (byStatus[candidate.status] || 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      mode: deleteAll ? "all" : "older_than_30_days",
      deletedListings: deleted,
      scannedCandidates: candidates.length,
      byStatus,
      limited: candidates.length >= MAX_DELETE_PER_RUN,
    });
  } catch (err) {
    console.error("POST /api/admin/cleanup-inactive-listings error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Inactive listing cleanup failed." },
      { status: 500 }
    );
  }
}
