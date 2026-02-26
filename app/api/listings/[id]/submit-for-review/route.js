// app/api/listings/[id]/submit-for-review/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";
import { notifyAdminListingPendingReview } from "@/lib/adminReviewNotifications";

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
        { ok: false, error: "Paid upgrades require an active subscription before submitting." },
        { status: 400 }
      );
    }
  }

  const now = new Date();

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
  await notifyAdminListingPendingReview({
    req,
    listingId: id,
    source: "api/listings/[id]/submit-for-review",
  });

  return NextResponse.json({ ok: true });
}
