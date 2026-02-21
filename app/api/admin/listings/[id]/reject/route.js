// app/api/admin/listings/[id]/reject/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi, audit } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const id = String(params?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, status: true, ownerId: true, paymentStatus: true, plan: true },
  });

  if (!listing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Keep paymentStatus as PAID so they do NOT repay
  const now = new Date();

  await prisma.listing.update({
    where: { id },
    data: {
      status: "REJECTED",
      submittedForReviewAt: null,

      reviewedAt: now,
      reviewedById: guard.me.id,
      rejectionReason: reason || "Changes required before publishing.",
    },
  });

  await audit({
    actorId: guard.me.id,
    action: "LISTING_REJECT",
    entityType: "Listing",
    entityId: id,
    reason: reason || null,
    meta: { plan: listing.plan, ownerId: listing.ownerId },
  });

  return NextResponse.json({ ok: true });
}
