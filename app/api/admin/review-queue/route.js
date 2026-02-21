// app/api/admin/review-queue/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function titleFromListing(l) {
  const year = l?.year != null ? String(l.year) : "";
  const builder = String(l?.builder || "").trim();
  const model = String(l?.model || "").trim();
  const fallback = String(l?.title || "Listing").trim();
  return [year, builder, model].filter(Boolean).join(" ") || fallback;
}

export async function GET() {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const items = await prisma.listing.findMany({
    where: { status: "PENDING_REVIEW", paymentStatus: "PAID" },
    orderBy: { submittedForReviewAt: "desc" },
    take: 50,
    select: {
      id: true,
      ownerId: true,
      title: true,
      year: true,
      builder: true,
      model: true,
      plan: true,
      paymentStatus: true,
      paymentProvider: true,
      paidAt: true,
      submittedForReviewAt: true,
      previewToken: true,
      price: true,
      currency: true,
      locationCity: true,
      locationState: true,
      locationCountry: true,
      heroImageUrl: true,
      createdAt: true,
    },
  });

  // Avoid assuming relation name; hydrate owner email separately
  const ownerIds = Array.from(new Set(items.map((x) => x.ownerId).filter(Boolean)));
  const users = ownerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, email: true, name: true },
      })
    : [];

  const userById = new Map(users.map((u) => [u.id, u]));

  const out = items.map((l) => {
    const u = userById.get(l.ownerId) || null;
    return {
      id: l.id,
      title: titleFromListing(l),
      plan: l.plan,
      ownerId: l.ownerId,
      ownerEmail: u?.email || null,
      ownerName: u?.name || null,
      submittedForReviewAt: l.submittedForReviewAt ? new Date(l.submittedForReviewAt).toISOString() : null,
      paidAt: l.paidAt ? new Date(l.paidAt).toISOString() : null,
      previewToken: l.previewToken || null,
      location:
        [l.locationCity, l.locationState, l.locationCountry].filter(Boolean).join(", ") || null,
      heroImageUrl: l.heroImageUrl || null,
    };
  });

  return NextResponse.json({ ok: true, items: out });
}
