import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  notifyAdminListingPendingReview,
  notifyOwnerListingPendingReviewAfterPurchase,
} from "@/lib/adminReviewNotifications";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/requestSecurity";
import { capturePayPalOrder, getPayPalOrder } from "@/lib/paypal";
import {
  FREE_LIMIT,
  MAX_LIMIT,
  addMonths,
  computeCheckoutTotals,
  decodeCheckoutCustomId,
  parseTermMonths,
  toMinorUnits,
} from "@/lib/paypalCheckout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractCapturedAmountCents(capture) {
  const pu = Array.isArray(capture?.purchase_units) ? capture.purchase_units[0] : null;
  const fromCapture = pu?.payments?.captures?.[0]?.amount?.value;
  const fallback = pu?.amount?.value;
  return toMinorUnits(fromCapture ?? fallback);
}

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

  if (!listingId) return null;
  if (!termMonths) return null;

  return { listingId, photoPlus, featuredHome, termMonths };
}

export async function POST(req) {
  try {
    if (!isTrustedOrigin(req)) {
      return NextResponse.json({ ok: false, error: "Invalid origin." }, { status: 403 });
    }

    const rl = rateLimit({
      key: makeRateLimitKey(req, "paypal_order_capture"),
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
    const orderId = String(body?.orderId || "").trim();
    if (!orderId) return NextResponse.json({ ok: false, error: "Missing orderId." }, { status: 400 });

    const capture = await capturePayPalOrder(orderId);
    const status = String(capture?.status || "").toUpperCase();
    if (status !== "COMPLETED") {
      return NextResponse.json(
        { ok: false, error: `PayPal order is not completed (status: ${status || "UNKNOWN"}).` },
        { status: 400 }
      );
    }

    const purchaseUnit = Array.isArray(capture?.purchase_units) ? capture.purchase_units[0] : null;
    const customId = String(purchaseUnit?.custom_id || "").trim();

    let decoded = decodeCheckoutCustomId(customId);
    let orderDetails = null;

    if (!decoded) {
      orderDetails = await getPayPalOrder(orderId).catch(() => null);
      const orderCustomId = String(orderDetails?.purchase_units?.[0]?.custom_id || "").trim();
      decoded = decodeCheckoutCustomId(orderCustomId);
    }

    if (!decoded) {
      decoded = parseFallbackContext(body?.checkoutContext);
    }

    if (!decoded) {
      return NextResponse.json({ ok: false, error: "Order metadata is invalid." }, { status: 400 });
    }
    const listing = await prisma.listing.findUnique({
      where: { id: decoded.listingId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        imageUrls: true,
      },
    });
    if (!listing || listing.ownerId !== s.uid) {
      return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
    }

    const photoCount = Array.isArray(listing.imageUrls) ? listing.imageUrls.length : 0;
    if (photoCount > MAX_LIMIT) return NextResponse.json({ ok: false, error: `Max ${MAX_LIMIT} photos.` }, { status: 400 });
    if (!decoded.photoPlus && photoCount > FREE_LIMIT) {
      return NextResponse.json(
        { ok: false, error: `Photo Plus required for more than ${FREE_LIMIT} photos.` },
        { status: 400 }
      );
    }

    const totals = computeCheckoutTotals({
      photoPlus: decoded.photoPlus,
      featuredHome: decoded.featuredHome,
      termMonths: decoded.termMonths,
    });
    if (totals.totalCents <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid checkout totals." }, { status: 400 });
    }

    const capturedCents = extractCapturedAmountCents(capture) ?? extractCapturedAmountCents(orderDetails);
    if (capturedCents == null || capturedCents !== totals.totalCents) {
      return NextResponse.json(
        { ok: false, error: "Captured amount does not match expected checkout total." },
        { status: 409 }
      );
    }

    const now = new Date();
    const listingStatus = String(listing.status || "").toUpperCase();
    const nextStatus =
      listingStatus === "ARCHIVED"
        ? "PUBLISHED"
        : listingStatus === "DRAFT" || listingStatus === "REJECTED"
        ? "PENDING_REVIEW"
        : listingStatus;
    const isPending = nextStatus === "PENDING_REVIEW";
    const periodEnd = addMonths(now, decoded.termMonths);

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

        billingCurrentPeriodStart: now,
        billingCurrentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: true,
        canceledAt: null,
        lastPaidAt: now,

        status: nextStatus,
        contentReviewStatus: isPending ? "PENDING" : "NONE",
        contentSubmittedAt: isPending ? now : null,

        expiresAt: nextStatus === "PUBLISHED" ? periodEnd : null,
        archivedAt: nextStatus === "PUBLISHED" ? null : undefined,
        archivedImagesPrunedAt: nextStatus === "PUBLISHED" ? null : undefined,
      },
    });

    if (isPending) {
      const adminNotice = await notifyAdminListingPendingReview({
        req,
        listingId: listing.id,
        source: "api/paypal/orders/capture",
      });
      if (!adminNotice?.ok) {
        console.warn("[paypal capture] admin review email not sent", {
          listingId: listing.id,
          orderId,
          reason: adminNotice?.skipped || adminNotice?.error || "unknown",
        });
      }

      const ownerNotice = await notifyOwnerListingPendingReviewAfterPurchase({
        req,
        listingId: listing.id,
        source: "api/paypal/orders/capture",
      });
      if (!ownerNotice?.ok) {
        console.warn("[paypal capture] owner confirmation email not sent", {
          listingId: listing.id,
          orderId,
          reason: ownerNotice?.skipped || ownerNotice?.error || "unknown",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      redirect: `/checkout/${encodeURIComponent(listing.id)}?success=1`,
    });
  } catch (e) {
    const issue = String(e?.paypalData?.details?.[0]?.issue || "").trim();
    const description =
      String(e?.paypalData?.details?.[0]?.description || "").trim() ||
      String(e?.message || "").trim() ||
      "Could not capture PayPal order.";
    const debugId = String(e?.paypalData?.debug_id || "").trim() || null;
    const recoverable = issue === "INSTRUMENT_DECLINED";

    return NextResponse.json(
      {
        ok: false,
        error: description,
        issue: issue || null,
        debugId,
        recoverable,
      },
      { status: recoverable ? 409 : Number(e?.httpStatus) || 500 }
    );
  }
}
