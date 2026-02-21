// app/api/billing/braintree/subscribe/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getBraintreeGateway } from "@/lib/braintree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_LIMIT = 3;
const MAX_LIMIT = 25;

function centsFromEnv(name, fallback) {
  const n = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req) {
  try {
    const s = await requireUser().catch(() => null);
    if (!s?.uid) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const listingId = String(body?.listingId || "").trim();
    const paymentMethodNonce = String(body?.paymentMethodNonce || "").trim();
    const photoPlus = Boolean(body?.photoPlus);
    const featuredHome = Boolean(body?.featuredHome);

    if (!listingId) return NextResponse.json({ ok: false, error: "Missing listingId." }, { status: 400 });
    if (!paymentMethodNonce) return NextResponse.json({ ok: false, error: "Missing payment method." }, { status: 400 });
    if (!photoPlus && !featuredHome) return NextResponse.json({ ok: false, error: "Select at least one upgrade." }, { status: 400 });

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerId: true, status: true, imageUrls: true, braintreeSubscriptionId: true },
    });

    if (!listing || listing.ownerId !== s.uid) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    if (listing.braintreeSubscriptionId) {
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
    const pmr = await gateway.paymentMethod.create({
      customerId,
      paymentMethodNonce,
      options: { makeDefault: true },
    });
    if (!pmr?.success) throw new Error(pmr?.message || "Could not save payment method.");
    const paymentMethodToken = pmr.paymentMethod.token;

    // ✅ Braintree plan + add-ons (set these env vars)
    const planId = String(process.env.BRAINTREE_PLAN_ID || "").trim();
    if (!planId) throw new Error("Missing BRAINTREE_PLAN_ID env var.");

    const addonPhotoPlusId = String(process.env.BRAINTREE_ADDON_PHOTO_PLUS_25_ID || "").trim();
    const addonFeaturedId = String(process.env.BRAINTREE_ADDON_FEATURED_HOME_ID || "").trim();

    const addOns = [];
    if (photoPlus) {
      if (!addonPhotoPlusId) throw new Error("Missing BRAINTREE_ADDON_PHOTO_PLUS_25_ID env var.");
      addOns.push({ inheritedFromId: addonPhotoPlusId, quantity: 1 });
    }
    if (featuredHome) {
      if (!addonFeaturedId) throw new Error("Missing BRAINTREE_ADDON_FEATURED_HOME_ID env var.");
      addOns.push({ inheritedFromId: addonFeaturedId, quantity: 1 });
    }

    const subRes = await gateway.subscription.create({
      paymentMethodToken,
      planId,
      addOns: addOns.length ? { add: addOns } : undefined,
    });

    if (!subRes?.success) throw new Error(subRes?.message || "Subscription failed.");
    const sub = subRes.subscription;

    const photoPlusCents = centsFromEnv("PHOTO_PLUS_25_PRICE_USD_CENTS", 500);
    const featuredCents = centsFromEnv("FEATURED_HOME_PRICE_USD_CENTS", 500);
    const monthlyCents = (photoPlus ? photoPlusCents : 0) + (featuredHome ? featuredCents : 0);

    const addonsArr = [];
    if (photoPlus) addonsArr.push("PHOTO_PLUS_25");
    if (featuredHome) addonsArr.push("FEATURED_HOME");

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

        billingCurrentPeriodStart: sub?.billingPeriodStartDate ? new Date(sub.billingPeriodStartDate) : null,
        billingCurrentPeriodEnd: sub?.billingPeriodEndDate ? new Date(sub.billingPeriodEndDate) : null,

        cancelAtPeriodEnd: false,
        canceledAt: null,
        lastPaidAt: new Date(),

        // ✅ submit for review immediately (seamless)
        status: "PENDING_REVIEW",
        contentReviewStatus: "PENDING",
        contentSubmittedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      redirect: `/listings/${listingId}?success=1`,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Subscription failed." }, { status: 500 });
  }
}