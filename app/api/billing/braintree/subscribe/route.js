// app/api/billing/braintree/subscribe/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getBraintreeGateway } from "@/lib/braintree";
import { notifyAdminListingPendingReview } from "@/lib/adminReviewNotifications";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_LIMIT = 3;
const MAX_LIMIT = 25;

const TERM_OPTIONS = new Set([1, 3, 6]);
const TERM_DISCOUNT = {
  3: 0.9,
  6: 0.8,
};

function centsFromEnv(name, fallback) {
  const n = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(n) ? n : fallback;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function parseTermMonths(v) {
  const n = Number(v);
  if (TERM_OPTIONS.has(n)) return n;
  return null;
}

function discountFactor(termMonths) {
  return TERM_DISCOUNT[termMonths] || 1;
}

function btErrMessage(res, fallback) {
  return (
    res?.message ||
    res?.errors?.deepErrors?.[0]?.message ||
    fallback
  );
}

function isNonceAlreadyUsedMessage(msg) {
  const s = String(msg || "").toLowerCase();
  return (
    s.includes("payment_method_nonce") &&
    (s.includes("more than once") || s.includes("already used") || s.includes("cannot use"))
  );
}

function isPlanIdInvalidMessage(msg) {
  const s = String(msg || "").toLowerCase();
  return s.includes("plan") && s.includes("invalid");
}

function looksLikePlaceholderPlanId(planId) {
  const s = String(planId || "").trim().toLowerCase();
  return !s || s.startsWith("your_") || s.includes("plan_id");
}

function resolvePlanId() {
  const envRaw = String(process.env.BRAINTREE_ENVIRONMENT || "sandbox").toLowerCase().trim();
  const isProd = envRaw === "production" || envRaw === "prod";

  const planId = (
    isProd
      ? process.env.BRAINTREE_PLAN_ID_PRODUCTION
      : process.env.BRAINTREE_PLAN_ID_SANDBOX
  ) || process.env.BRAINTREE_PLAN_ID || process.env.BRAINTREE_PLAN_STANDARD_MONTHLY_ID || "";

  const planIdTrimmed = String(planId).trim();
  if (looksLikePlaceholderPlanId(planIdTrimmed)) {
    if (isProd) {
      throw new Error(
        "Braintree plan is not configured for production. Set BRAINTREE_PLAN_ID_PRODUCTION (or BRAINTREE_PLAN_ID) to a valid Production plan ID."
      );
    }
    throw new Error(
      "Braintree plan is not configured for sandbox. Set BRAINTREE_PLAN_ID_SANDBOX (or BRAINTREE_PLAN_ID) to a valid Sandbox plan ID."
    );
  }
  return planIdTrimmed;
}

export async function POST(req) {
  try {
    if (!isTrustedOrigin(req)) {
      return NextResponse.json({ ok: false, error: "Invalid origin." }, { status: 403 });
    }

    const rl = rateLimit({
      key: makeRateLimitKey(req, "braintree_subscribe"),
      limit: 20,
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
    const listingId = String(body?.listingId || "").trim();
    const paymentMethodNonce = String(body?.paymentMethodNonce || "").trim();
    const photoPlus = Boolean(body?.photoPlus);
    const featuredHome = Boolean(body?.featuredHome);
    const termMonths = parseTermMonths(body?.termMonths);
    const autoRenew = Boolean(body?.autoRenew);

    if (!listingId) return NextResponse.json({ ok: false, error: "Missing listingId." }, { status: 400 });
    if (!paymentMethodNonce) return NextResponse.json({ ok: false, error: "Missing payment method." }, { status: 400 });
    if (!photoPlus && !featuredHome) return NextResponse.json({ ok: false, error: "Select at least one upgrade." }, { status: 400 });
    if (!termMonths) return NextResponse.json({ ok: false, error: "Select a 1, 3, or 6 month term." }, { status: 400 });

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        imageUrls: true,
        braintreeSubscriptionId: true,
        billingStatus: true,
      },
    });

    if (!listing || listing.ownerId !== s.uid) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    if (listing.braintreeSubscriptionId && String(listing.billingStatus || "").toUpperCase() === "ACTIVE") {
      return NextResponse.json(
        { ok: false, error: "Subscription already exists for this listing. Cancel it first to change upgrades." },
        { status: 400 }
      );
    }

    const photoCount = Array.isArray(listing.imageUrls) ? listing.imageUrls.length : 0;
    if (photoCount > MAX_LIMIT) return NextResponse.json({ ok: false, error: `Max ${MAX_LIMIT} photos.` }, { status: 400 });
    if (!photoPlus && photoCount > FREE_LIMIT) {
      return NextResponse.json({ ok: false, error: `Photo Plus required for more than ${FREE_LIMIT} photos.` }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: s.uid },
      select: { id: true, email: true, deletedAt: true, isDisabled: true, braintreeCustomerId: true },
    });

    if (!user || user.deletedAt || user.isDisabled) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const gateway = getBraintreeGateway();

    // ✅ ensure customer
    let customerId = user.braintreeCustomerId;
    if (!customerId) {
      const cr = await gateway.customer.create({ email: user.email });
      if (!cr?.success) throw new Error(cr?.message || "Could not create customer.");
      customerId = cr.customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { braintreeCustomerId: customerId },
      });
    }

    // ✅ attach payment method (token required for subscriptions)
    let paymentMethodToken = "";
    const pmr = await gateway.paymentMethod.create({
      customerId,
      paymentMethodNonce,
      options: { makeDefault: true },
    });
    if (pmr?.success) {
      paymentMethodToken = String(pmr?.paymentMethod?.token || "");
    } else {
      const pmMsg = btErrMessage(pmr, "Could not save payment method.");
      if (isNonceAlreadyUsedMessage(pmMsg)) {
        const customer = await gateway.customer.find(customerId).catch(() => null);
        const methods = Array.isArray(customer?.paymentMethods) ? customer.paymentMethods : [];
        const preferred = methods.find((m) => m?.default) || methods[0];
        if (preferred?.token) {
          paymentMethodToken = String(preferred.token);
        } else {
          throw new Error("That payment authorization expired. Please choose your payment method again.");
        }
      } else {
        throw new Error(pmMsg);
      }
    }
    if (!paymentMethodToken) throw new Error("Could not determine payment method.");

    // ✅ Braintree plan + add-ons (set these env vars)
    const planId = resolvePlanId();

    const photoPlusCents = centsFromEnv("PHOTO_PLUS_25_PRICE_USD_CENTS", 700);
    const featuredCents = centsFromEnv("FEATURED_HOME_PRICE_USD_CENTS", 1000);
    const baseMonthlyCents = (photoPlus ? photoPlusCents : 0) + (featuredHome ? featuredCents : 0);
    if (baseMonthlyCents <= 0) throw new Error("Invalid upgrade pricing.");

    const monthlyCents = Math.round(baseMonthlyCents * discountFactor(termMonths));
    const monthlyPrice = (monthlyCents / 100).toFixed(2);

    const subRes = await gateway.subscription.create({
      paymentMethodToken,
      planId,
      price: monthlyPrice,
      numberOfBillingCycles: autoRenew ? undefined : termMonths,
    });

    if (!subRes?.success) {
      const subMsg = btErrMessage(subRes, "Subscription failed.");
      if (isPlanIdInvalidMessage(subMsg)) {
        const envRaw = String(process.env.BRAINTREE_ENVIRONMENT || "sandbox").toLowerCase().trim();
        const isProd = envRaw === "production" || envRaw === "prod";
        throw new Error(
          isProd
            ? "Braintree rejected the configured production plan. Verify BRAINTREE_PLAN_ID_PRODUCTION (or BRAINTREE_PLAN_ID) matches an active Production plan ID."
            : "Braintree rejected the configured sandbox plan. Verify BRAINTREE_PLAN_ID_SANDBOX (or BRAINTREE_PLAN_ID) matches an active Sandbox plan ID."
        );
      }
      throw new Error(subMsg);
    }
    const sub = subRes.subscription;

    const addonsArr = [];
    if (photoPlus) addonsArr.push("PHOTO_PLUS_25");
    if (featuredHome) addonsArr.push("FEATURED_HOME");

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
      where: { id: listingId },
      data: {
        photoPlan: photoPlus ? "PHOTO_PLUS_25" : "FREE_3",
        featuredHome: featuredHome,

        billingStatus: "ACTIVE",
        billingProvider: "BRAINTREE",
        braintreeSubscriptionId: sub.id,
        billingAddons: addonsArr,

        billingCurrency: "USD",
        billingMonthlyCents: monthlyCents,
        billingTermMonths: termMonths,
        billingAutoRenew: autoRenew,

        billingCurrentPeriodStart: sub?.billingPeriodStartDate ? new Date(sub.billingPeriodStartDate) : now,
        billingCurrentPeriodEnd: sub?.billingPeriodEndDate ? new Date(sub.billingPeriodEndDate) : addMonths(now, 1),

        cancelAtPeriodEnd: !autoRenew,
        canceledAt: null,
        lastPaidAt: now,

        // ✅ submit for review (drafts) or republish (renewals)
        status: nextStatus,
        contentReviewStatus: isPending ? "PENDING" : "NONE",
        contentSubmittedAt: isPending ? now : null,

        // ✅ expiration / archive reset on renewals
        expiresAt: nextStatus === "PUBLISHED" ? expiresAt : null,
        archivedAt: nextStatus === "PUBLISHED" ? null : undefined,
        archivedImagesPrunedAt: nextStatus === "PUBLISHED" ? null : undefined,
      },
    });
    if (isPending) {
      await notifyAdminListingPendingReview({
        req,
        listingId,
        source: "api/billing/braintree/subscribe",
      });
    }

    return NextResponse.json({
      ok: true,
      redirect: `/checkout/${listingId}?success=1`,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Subscription failed." }, { status: 500 });
  }
}
