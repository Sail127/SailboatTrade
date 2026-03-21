// app/api/listings/[id]/submit-for-review/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";
import {
  notifyAdminListingPendingReview,
  notifyOwnerListingPendingReviewAfterPurchase,
} from "@/lib/adminReviewNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const s = await readSession();
  if (!s?.uid) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const id = String(params?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      status: true,
      photoPlan: true,
      featuredHome: true,
      billingAddons: true,
      billingStatus: true,
    },
  });

  if (!listing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (listing.ownerId !== s.uid) return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });

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

  await prisma.listing.update({
    where: { id },
    data: {
      status: "PENDING_REVIEW",
      contentReviewStatus: "PENDING",
      contentSubmittedAt: now,

      // clear old rejection info on resubmit
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

  const adminNotice = await notifyAdminListingPendingReview({
    req,
    listingId: id,
    source: "api/listings/[id]/submit-for-review",
  });
  if (!adminNotice?.ok) {
    console.warn("[submit-for-review] admin review email not sent", {
      listingId: id,
      reason: adminNotice?.skipped || adminNotice?.error || "unknown",
    });
  }

  const ownerNotice = await notifyOwnerListingPendingReviewAfterPurchase({
    req,
    listingId: id,
    source: "api/listings/[id]/submit-for-review",
  });
  if (!ownerNotice?.ok) {
    console.warn("[submit-for-review] owner pending-review email not sent", {
      listingId: id,
      reason: ownerNotice?.skipped || ownerNotice?.error || "unknown",
    });
  }

  return NextResponse.json({ ok: true });
}
