// app/api/admin/listings/[id]/approve/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi, audit } from "@/lib/admin";
import { notifyOwnerListingPublished } from "@/lib/adminReviewNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_EXPIRE_DAYS = 30;

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function requiresPaidUpgrade(listing) {
  const addons = Array.isArray(listing?.billingAddons) ? listing.billingAddons : [];
  const hasPhotoPlus = listing?.photoPlan === "PHOTO_PLUS_25" || addons.includes("PHOTO_PLUS_25");
  const hasFeatured = !!listing?.featuredHome || addons.includes("FEATURED_HOME");
  return hasPhotoPlus || hasFeatured;
}

function hasActivePayment(listing) {
  const status = String(listing?.billingStatus || "").toUpperCase();
  return status === "ACTIVE";
}

export async function POST(req, { params }) {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const id = String(params?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

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
      billingTermMonths: true,
    },
  });

  if (!listing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (requiresPaidUpgrade(listing) && !hasActivePayment(listing)) {
    return NextResponse.json(
      { ok: false, error: "Paid upgrades require an active subscription." },
      { status: 400 }
    );
  }

  // idempotent
  if (listing.status === "PUBLISHED") return NextResponse.json({ ok: true, alreadyPublished: true });

  const now = new Date();
  const termMonths = Number(listing.billingTermMonths || 1);
  const expiresAt = requiresPaidUpgrade(listing) ? addMonths(now, termMonths) : addDays(now, FREE_EXPIRE_DAYS);

  await prisma.listing.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      expiresAt,
      archivedAt: null,
      archivedImagesPrunedAt: null,

      reviewedAt: now,
      reviewedById: guard.me.id,
      rejectionReason: null, // clear if previously rejected

      contentReviewStatus: "NONE",
      contentReviewedAt: now,
      contentReviewedById: guard.me.id,
      contentRejectionReason: null,
    },
  });

  await audit({
    actorId: guard.me.id,
    action: "LISTING_APPROVE",
    entityType: "Listing",
    entityId: id,
    reason: null,
    meta: {
      ownerId: listing.ownerId,
      photoPlan: listing.photoPlan,
      featuredHome: listing.featuredHome,
      billingStatus: listing.billingStatus,
      billingAddons: listing.billingAddons,
    },
  });

  const ownerNotice = await notifyOwnerListingPublished({
    req,
    listingId: id,
    source: "api/admin/listings/[id]/approve",
  });
  if (!ownerNotice?.ok) {
    console.warn("[admin approve] owner publish email not sent", {
      listingId: id,
      reason: ownerNotice?.skipped || ownerNotice?.error || "unknown",
    });
  }

  return NextResponse.json({ ok: true });
}
