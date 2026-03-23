import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/requestSecurity";
import { getPayPalSubscription } from "@/lib/paypal";
import {
  notifyAdminListingPendingReview,
  notifyOwnerListingPendingReviewAfterPurchase,
  notifyOwnerListingPublished,
  notifyOwnerListingUpgradeConfirmation,
} from "@/lib/adminReviewNotifications";
import {
  FREE_LIMIT,
  MAX_LIMIT,
  computeCheckoutTotals,
  decodeCheckoutCustomId,
  parseTermMonths,
} from "@/lib/paypalCheckout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asBool(v) {
  if (v === true || v === false) return v;
  const s = String(v || "").toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes";
}

function parseFallbackContext(raw) {
  if (!raw || typeof raw !== "object") return null;
  const listingId = String(raw?.listingId || "").trim();
  const photoPlus = asBool(raw?.photoPlus);
  const featuredHome = asBool(raw?.featuredHome);
  const termMonths = parseTermMonths(raw?.termMonths, 0);
  if (!listingId || !termMonths) return null;
  return { listingId, photoPlus, featuredHome, termMonths };
}

function toDate(value, fallback = null) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export async function POST(req) {
  try {
    if (!isTrustedOrigin(req)) {
      return NextResponse.json({ ok: false, error: "Invalid origin." }, { status: 403 });
    }

    const rl = rateLimit({
      key: makeRateLimitKey(req, "paypal_subscription_activate"),
      limit: 40,
      windowMs: 10 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many payment attempts. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const s = await requireUser().catch(() => null);
    if (!s?.uid) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const subscriptionId = String(body?.subscriptionId || "").trim();
    if (!subscriptionId) {
      return NextResponse.json({ ok: false, error: "Missing subscriptionId." }, { status: 400 });
    }

    const subscription = await getPayPalSubscription(subscriptionId);
    const customId = String(subscription?.custom_id || "").trim();
    const decoded = decodeCheckoutCustomId(customId) || parseFallbackContext(body?.checkoutContext);
    if (!decoded) {
      return NextResponse.json({ ok: false, error: "Subscription metadata is invalid." }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: decoded.listingId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        imageUrls: true,
        saleReport: {
          select: { id: true },
        },
      },
    });
    if (!listing || listing.ownerId !== s.uid) {
      return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
    }
    if (listing.saleReport?.id) {
      return NextResponse.json(
        { ok: false, error: "Sold listings cannot be reposted. Create a new listing instead." },
        { status: 403 }
      );
    }

    const photoCount = Array.isArray(listing.imageUrls) ? listing.imageUrls.length : 0;
    if (photoCount > MAX_LIMIT) return NextResponse.json({ ok: false, error: `Max ${MAX_LIMIT} photos.` }, { status: 400 });
    if (!decoded.photoPlus && photoCount > FREE_LIMIT) {
      return NextResponse.json(
        { ok: false, error: `Photo Plus required for more than ${FREE_LIMIT} photos.` },
        { status: 400 }
      );
    }

    const totals = computeCheckoutTotals(decoded);
    if (totals.totalCents <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid subscription total." }, { status: 400 });
    }

    const listingStatus = String(listing.status || "").toUpperCase();
    const nextStatus =
      listingStatus === "ARCHIVED"
        ? "PUBLISHED"
        : listingStatus === "DRAFT" || listingStatus === "REJECTED"
        ? "PENDING_REVIEW"
        : listingStatus;
    const isPending = nextStatus === "PENDING_REVIEW";
    const startTime = toDate(subscription?.start_time, new Date());
    const nextBillingTime = toDate(subscription?.billing_info?.next_billing_time, null);
    const planId = String(subscription?.plan_id || "").trim() || null;

    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        photoPlan: decoded.photoPlus ? "PHOTO_PLUS_25" : "FREE_3",
        featuredHome: decoded.featuredHome,
        billingStatus: "ACTIVE",
        billingProvider: "PAYPAL",
        billingAddons: [
          ...(decoded.photoPlus ? ["PHOTO_PLUS_25"] : []),
          ...(decoded.featuredHome ? ["FEATURED_HOME"] : []),
        ],
        billingCurrency: "USD",
        billingMonthlyCents: totals.monthlyCents,
        billingTermMonths: decoded.termMonths,
        billingCurrentPeriodStart: startTime,
        billingCurrentPeriodEnd: nextBillingTime,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        lastPaidAt: startTime,
        billingAutoRenew: true,
        billingSubscriptionId: subscriptionId,
        billingPlanId: planId,
        status: nextStatus,
        contentReviewStatus: isPending ? "PENDING" : "NONE",
        contentSubmittedAt: isPending ? startTime : null,
        expiresAt: nextStatus === "PUBLISHED" ? nextBillingTime : null,
        renewalReminderLastSentAt: null,
        expiredEmailSentAt: null,
        archivedAt: nextStatus === "PUBLISHED" ? null : undefined,
        archivedImagesPrunedAt: nextStatus === "PUBLISHED" ? null : undefined,
      },
    });

    const ownerUpgradeNotice = await notifyOwnerListingUpgradeConfirmation({
      req,
      listingId: listing.id,
      photoPlus: decoded.photoPlus,
      featuredHome: decoded.featuredHome,
      termMonths: decoded.termMonths,
      totalCents: totals.totalCents,
      currency: "USD",
      nextStatus,
      source: "api/paypal/subscriptions/activate",
    });
    if (!ownerUpgradeNotice?.ok) {
      console.warn("[paypal subscription activate] owner upgrade confirmation email not sent", {
        listingId: listing.id,
        subscriptionId,
        reason: ownerUpgradeNotice?.skipped || ownerUpgradeNotice?.error || "unknown",
      });
    }

    if (isPending) {
      const adminNotice = await notifyAdminListingPendingReview({
        req,
        listingId: listing.id,
        source: "api/paypal/subscriptions/activate",
      });
      if (!adminNotice?.ok) {
        console.warn("[paypal subscription activate] admin review email not sent", {
          listingId: listing.id,
          subscriptionId,
          reason: adminNotice?.skipped || adminNotice?.error || "unknown",
        });
      }

      const ownerNotice = await notifyOwnerListingPendingReviewAfterPurchase({
        req,
        listingId: listing.id,
        source: "api/paypal/subscriptions/activate",
      });
      if (!ownerNotice?.ok) {
        console.warn("[paypal subscription activate] owner pending review email not sent", {
          listingId: listing.id,
          subscriptionId,
          reason: ownerNotice?.skipped || ownerNotice?.error || "unknown",
        });
      }
    } else if (nextStatus === "PUBLISHED" && listingStatus !== "PUBLISHED") {
      const ownerPublishedNotice = await notifyOwnerListingPublished({
        req,
        listingId: listing.id,
        source: "api/paypal/subscriptions/activate",
      });
      if (!ownerPublishedNotice?.ok) {
        console.warn("[paypal subscription activate] owner published email not sent", {
          listingId: listing.id,
          subscriptionId,
          reason: ownerPublishedNotice?.skipped || ownerPublishedNotice?.error || "unknown",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      redirect: `/checkout/${encodeURIComponent(listing.id)}?success=1`,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Could not activate PayPal subscription." },
      { status: Number(e?.httpStatus) || 500 }
    );
  }
}
