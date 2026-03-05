import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notifyAdminListingPendingReview } from "@/lib/adminReviewNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const s = await requireUser().catch(() => null);
  if (!s?.uid) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });
  }

  const listing = await prisma.listing.findFirst({
    where: { id, ownerId: s.uid },
    select: {
      id: true,
      status: true,
      photoPlan: true,
      featuredHome: true,
      billingAddons: true,
      billingStatus: true,
    },
  });
  if (!listing) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

  const addons = Array.isArray(listing.billingAddons) ? listing.billingAddons : [];
  const requiresPaid =
    listing.photoPlan === "PHOTO_PLUS_25" || !!listing.featuredHome || addons.length > 0;

  if (requiresPaid) {
    const billingOk = String(listing.billingStatus || "").toUpperCase() === "ACTIVE";
    if (!billingOk) {
      return NextResponse.json(
        { ok: false, error: "Paid upgrades require active billing before submitting." },
        { status: 400 }
      );
    }
  }

  const now = new Date();
  const wasPublished = String(listing.status || "").toUpperCase() === "PUBLISHED";

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      status: "PENDING_REVIEW",
      contentReviewStatus: "PENDING",
      contentSubmittedAt: now,

      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
      contentRejectionReason: null,
      contentReviewedAt: null,
      contentReviewedById: null,
      expiresAt: null,
      archivedAt: null,
      archivedImagesPrunedAt: null,
    },
  });
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: s.uid,
        action: wasPublished ? "LISTING_CHANGE_REAPPROVAL_SUBMIT" : "LISTING_NEW_REVIEW_SUBMIT",
        entityType: "Listing",
        entityId: id,
        meta: {
          reviewType: wasPublished ? "CHANGE_APPROVAL" : "NEW_LISTING_REVIEW",
          changedSections: wasPublished ? ["Listing content"] : [],
        },
      },
    });
  } catch {}

  await notifyAdminListingPendingReview({
    req,
    listingId: updated.id,
    source: "listings/[id]/publish",
  });

  return NextResponse.json({ ok: true, listingId: updated.id });
}
