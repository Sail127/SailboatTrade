// app/api/admin/listings/[id]/reject/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi, audit } from "@/lib/admin";
import { notifyOwnerListingRejected } from "@/lib/adminReviewNotifications";

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
  if (!reason) {
    return NextResponse.json(
      { ok: false, error: "A comment is required to send this listing back to draft." },
      { status: 400 }
    );
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      ownerId: true,
      photoPlan: true,
      featuredHome: true,
      billingStatus: true,
      billingAddons: true,
    },
  });

  if (!listing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const now = new Date();

  await prisma.listing.update({
    where: { id },
    data: {
      status: "REJECTED",

      reviewedAt: now,
      reviewedById: guard.me.id,
      rejectionReason: reason,

      contentReviewStatus: "REJECTED",
      contentReviewedAt: now,
      contentReviewedById: guard.me.id,
      contentRejectionReason: reason,
    },
  });

  await audit({
    actorId: guard.me.id,
    action: "LISTING_REJECT",
    entityType: "Listing",
    entityId: id,
    reason,
    meta: {
      ownerId: listing.ownerId,
      photoPlan: listing.photoPlan,
      featuredHome: listing.featuredHome,
      billingStatus: listing.billingStatus,
      billingAddons: listing.billingAddons,
    },
  });

  const ownerNotice = await notifyOwnerListingRejected({
    req,
    listingId: id,
    rejectionReason: reason,
    source: "api/admin/listings/[id]/reject",
  });
  if (!ownerNotice?.ok) {
    console.warn("[admin reject] owner rejection email not sent", {
      listingId: id,
      reason: ownerNotice?.skipped || ownerNotice?.error || "unknown",
    });
  }

  return NextResponse.json({ ok: true });
}
