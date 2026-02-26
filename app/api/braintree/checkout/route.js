// app/api/braintree/checkout/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";
import { getBraintreeGateway } from "@/lib/braintree";
import { notifyAdminListingPendingReview } from "@/lib/adminReviewNotifications";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/requestSecurity";

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

function dollarsFromCents(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

export async function POST(req) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  }

  const rl = rateLimit({
    key: makeRateLimitKey(req, "braintree_checkout"),
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many payment attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const s = await readSession();
  if (!s?.uid) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });

  const body = await req.json().catch(() => null);

  const listingId = String(body?.listingId || "").trim();
  const nonce = String(body?.nonce || body?.paymentMethodNonce || "").trim();
  const planFromBody = String(body?.plan || "").toUpperCase().trim();
  const termMonths = parseTermMonths(body?.termMonths);

  if (!listingId) return NextResponse.json({ ok: false, error: "Missing listingId" }, { status: 400 });
  if (!nonce) return NextResponse.json({ ok: false, error: "Missing nonce" }, { status: 400 });

  const photoPlus = Boolean(body?.photoPlus) || planFromBody === "STANDARD";
  const featuredHome = Boolean(body?.featuredHome) || planFromBody === "FEATURED_HOME";

  if (!photoPlus && !featuredHome) {
    return NextResponse.json({ ok: false, error: "Select at least one upgrade." }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, ownerId: true, status: true },
  });

  if (!listing) return NextResponse.json({ ok: false, error: "Listing not found" }, { status: 404 });
  if (listing.ownerId !== s.uid) return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });

  const photoPlusCents = Number.parseInt(process.env.PHOTO_PLUS_25_PRICE_USD_CENTS || "700", 10);
  const featuredCents = Number.parseInt(process.env.FEATURED_HOME_PRICE_USD_CENTS || "1000", 10);
  const baseMonthlyCents = (photoPlus ? photoPlusCents : 0) + (featuredHome ? featuredCents : 0);
  const monthlyCents = Math.round(baseMonthlyCents * discountFactor(termMonths));
  const totalCents = monthlyCents * termMonths;

  const gateway = getBraintreeGateway();

  const result = await gateway.transaction.sale({
    amount: dollarsFromCents(totalCents),
    paymentMethodNonce: nonce,
    options: { submitForSettlement: true },
  });

  if (!result?.success) {
    const msg =
      result?.message ||
      result?.errors?.deepErrors?.[0]?.message ||
      "Payment failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 402 });
  }

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
      featuredHome: featuredHome,

      billingStatus: "ACTIVE",
      billingProvider: "BRAINTREE",
      billingAddons: [
        ...(photoPlus ? ["PHOTO_PLUS_25"] : []),
        ...(featuredHome ? ["FEATURED_HOME"] : []),
      ],
      billingMonthlyCents: monthlyCents,
      billingTermMonths: termMonths,
      billingAutoRenew: false,

      billingCurrentPeriodStart: now,
      billingCurrentPeriodEnd: expiresAt,
      lastPaidAt: now,

      status: nextStatus,
      contentReviewStatus: isPending ? "PENDING" : "NONE",
      contentSubmittedAt: isPending ? now : null,

      expiresAt: nextStatus === "PUBLISHED" ? expiresAt : null,
      archivedAt: nextStatus === "PUBLISHED" ? null : undefined,
      archivedImagesPrunedAt: nextStatus === "PUBLISHED" ? null : undefined,
    },
  });
  if (isPending) {
    await notifyAdminListingPendingReview({
      req,
      listingId: listing.id,
      source: "api/braintree/checkout",
    });
  }

  return NextResponse.json({
    ok: true,
    redirect: `/checkout/${encodeURIComponent(listing.id)}?success=1`,
  });
}
