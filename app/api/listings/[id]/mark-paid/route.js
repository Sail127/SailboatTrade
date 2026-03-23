// app/api/listings/[id]/mark-paid/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi, audit } from "@/lib/admin";
import {
  notifyAdminListingPendingReview,
  notifyOwnerListingPendingReviewAfterPurchase,
  notifyOwnerListingPublished,
  notifyOwnerListingUpgradeConfirmation,
} from "@/lib/adminReviewNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERM_OPTIONS = new Set([1, 3, 6]);
const TERM_DISCOUNT = { 3: 0.9, 6: 0.8 };

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function parseTermMonths(v) {
  const n = Number(v);
  return TERM_OPTIONS.has(n) ? n : 1;
}

function discountFactor(termMonths) {
  return TERM_DISCOUNT[termMonths] || 1;
}

export async function POST(req, { params }) {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const id = String(params?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing listing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const photoPlus = Boolean(body?.photoPlus ?? true);
  const featuredHome = Boolean(body?.featuredHome ?? false);
  const termMonths = parseTermMonths(body?.termMonths);

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, ownerId: true, status: true },
  });

  if (!listing) return NextResponse.json({ ok: false, error: "Listing not found" }, { status: 404 });

  const photoPlusCents = Number.parseInt(process.env.PHOTO_PLUS_25_PRICE_USD_CENTS || "700", 10);
  const featuredCents = Number.parseInt(process.env.FEATURED_HOME_PRICE_USD_CENTS || "700", 10);
  const baseMonthlyCents = (photoPlus ? photoPlusCents : 0) + (featuredHome ? featuredCents : 0);
  const monthlyCents = Math.round(baseMonthlyCents * discountFactor(termMonths));

  const now = new Date();
  const status = String(listing.status || "").toUpperCase();
  const nextStatus =
    status === "ARCHIVED"
      ? "PUBLISHED"
      : status === "DRAFT" || status === "REJECTED"
      ? "PENDING_REVIEW"
      : status;

  const isPending = nextStatus === "PENDING_REVIEW";
  const expiresAt = addMonths(now, termMonths);

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      photoPlan: photoPlus ? "PHOTO_PLUS_25" : "FREE_3",
      featuredHome,
      billingStatus: "ACTIVE",
      billingProvider: "TEST",
      billingAddons: [
        ...(photoPlus ? ["PHOTO_PLUS_25"] : []),
        ...(featuredHome ? ["FEATURED_HOME"] : []),
      ],
      billingMonthlyCents: monthlyCents,
      billingTermMonths: termMonths,
      billingCurrentPeriodStart: now,
      billingCurrentPeriodEnd: addMonths(now, termMonths),
      lastPaidAt: now,

      status: nextStatus,
      contentReviewStatus: isPending ? "PENDING" : "NONE",
      contentSubmittedAt: isPending ? now : null,
      expiresAt: nextStatus === "PUBLISHED" ? expiresAt : null,
      renewalReminderLastSentAt: null,
      expiredEmailSentAt: null,
      archivedAt: nextStatus === "PUBLISHED" ? null : undefined,
      archivedImagesPrunedAt: nextStatus === "PUBLISHED" ? null : undefined,
    },
  });

  const ownerUpgradeNotice = await notifyOwnerListingUpgradeConfirmation({
    req,
    listingId: listing.id,
    photoPlus,
    featuredHome,
    termMonths,
    totalCents: monthlyCents * termMonths,
    currency: "USD",
    nextStatus,
    source: "api/listings/[id]/mark-paid",
  });
  if (!ownerUpgradeNotice?.ok) {
    console.warn("[mark-paid] owner upgrade confirmation email not sent", {
      listingId: listing.id,
      reason: ownerUpgradeNotice?.skipped || ownerUpgradeNotice?.error || "unknown",
    });
  }

  if (isPending) {
    const adminNotice = await notifyAdminListingPendingReview({
      req,
      listingId: listing.id,
      source: "api/listings/[id]/mark-paid",
    });
    if (!adminNotice?.ok) {
      console.warn("[mark-paid] admin review email not sent", {
        listingId: listing.id,
        reason: adminNotice?.skipped || adminNotice?.error || "unknown",
      });
    }

    const ownerPendingNotice = await notifyOwnerListingPendingReviewAfterPurchase({
      req,
      listingId: listing.id,
      source: "api/listings/[id]/mark-paid",
    });
    if (!ownerPendingNotice?.ok) {
      console.warn("[mark-paid] owner pending review email not sent", {
        listingId: listing.id,
        reason: ownerPendingNotice?.skipped || ownerPendingNotice?.error || "unknown",
      });
    }
  } else if (nextStatus === "PUBLISHED" && status !== "PUBLISHED") {
    const ownerPublishedNotice = await notifyOwnerListingPublished({
      req,
      listingId: listing.id,
      source: "api/listings/[id]/mark-paid",
    });
    if (!ownerPublishedNotice?.ok) {
      console.warn("[mark-paid] owner published email not sent", {
        listingId: listing.id,
        reason: ownerPublishedNotice?.skipped || ownerPublishedNotice?.error || "unknown",
      });
    }
  }

  await audit({
    actorId: guard.me.id,
    action: "LISTING_MARK_PAID_TEST",
    entityType: "Listing",
    entityId: listing.id,
    reason: null,
    meta: { ownerId: listing.ownerId, termMonths },
  });

  return NextResponse.json({
    ok: true,
    redirect: `/checkout/${encodeURIComponent(listing.id)}?success=1`,
  });
}
