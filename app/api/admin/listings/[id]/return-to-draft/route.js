import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, requireAdminApi } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing listing id." }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      status: true,
      title: true,
      featuredHome: true,
      billingStatus: true,
      billingAddons: true,
    },
  });

  if (!listing) {
    return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
  }

  if (String(listing.status || "").toUpperCase() !== "PUBLISHED") {
    return NextResponse.json(
      { ok: false, error: "Only active listings can be returned to draft." },
      { status: 400 }
    );
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      status: "DRAFT",
      expiresAt: null,
      archivedAt: null,
      archivedImagesPrunedAt: null,
      reviewedAt: null,
      reviewedById: null,
      rejectionReason: null,
      contentReviewStatus: "NONE",
      contentSubmittedAt: null,
      contentReviewedAt: null,
      contentReviewedById: null,
      contentRejectionReason: null,
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
    },
  });

  await audit({
    actorId: guard.me.id,
    action: "LISTING_RETURN_TO_DRAFT",
    entityType: "Listing",
    entityId: listing.id,
    reason: null,
    meta: {
      ownerId: listing.ownerId,
      previousStatus: listing.status,
      featuredHome: listing.featuredHome,
      billingStatus: listing.billingStatus,
      billingAddons: listing.billingAddons,
      title: listing.title,
    },
  });

  return NextResponse.json({ ok: true, listing: updated });
}
