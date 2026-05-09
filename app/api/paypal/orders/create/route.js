import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/requestSecurity";
import { createPayPalOrder } from "@/lib/paypal";
import {
  FREE_LIMIT,
  MAX_LIMIT,
  computeCheckoutTotals,
  dollarsFromCents,
  encodeCheckoutCustomId,
  parseTermMonths,
} from "@/lib/paypalCheckout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asBool(v) {
  if (v === true || v === false) return v;
  const s = String(v || "").toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes";
}

function resolveAppOrigin(req) {
  const fromReq = String(req?.nextUrl?.origin || "").trim();
  if (fromReq) return fromReq.replace(/\/+$/, "");
  const fromEnv = String(process.env.APP_URL || "").trim();
  return fromEnv.replace(/\/+$/, "");
}

export async function POST(req) {
  try {
    if (!isTrustedOrigin(req)) {
      return NextResponse.json({ ok: false, error: "Invalid origin." }, { status: 403 });
    }

    const rl = await rateLimit({
      key: makeRateLimitKey(req, "paypal_order_create"),
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

    const listingId = String(body?.listingId || "").trim();
    const photoPlus = asBool(body?.photoPlus);
    const featuredHome = asBool(body?.featuredHome);
    const termMonths = parseTermMonths(body?.termMonths, 0);

    if (!listingId) return NextResponse.json({ ok: false, error: "Missing listingId." }, { status: 400 });
    if (!photoPlus && !featuredHome) {
      return NextResponse.json({ ok: false, error: "Select at least one upgrade." }, { status: 400 });
    }
    if (!termMonths) {
      return NextResponse.json({ ok: false, error: "Select a 1, 3, or 6 month term." }, { status: 400 });
    }
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        imageUrls: true,
        billingStatus: true,
        photoPlan: true,
        featuredHome: true,
        billingAddons: true,
        saleReport: {
          select: { id: true },
        },
      },
    });

    if (!listing || listing.ownerId !== s.uid) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    if (listing.saleReport?.id) {
      return NextResponse.json(
        { ok: false, error: "Sold listings cannot be reposted. Create a new listing instead." },
        { status: 403 }
      );
    }

    const addons = Array.isArray(listing.billingAddons) ? listing.billingAddons : [];
    const currentPhotoPlus =
      String(listing.photoPlan || "").toUpperCase() === "PHOTO_PLUS_25" ||
      addons.includes("PHOTO_PLUS_25");
    const currentFeaturedHome = Boolean(listing.featuredHome) || addons.includes("FEATURED_HOME");
    const billingActive = String(listing.billingStatus || "").toUpperCase() === "ACTIVE";

    if (billingActive && photoPlus === currentPhotoPlus && featuredHome === currentFeaturedHome) {
      return NextResponse.json(
        { ok: false, error: "This listing already has active billing for the selected upgrades." },
        { status: 400 }
      );
    }

    const photoCount = Array.isArray(listing.imageUrls) ? listing.imageUrls.length : 0;
    if (photoCount > MAX_LIMIT) {
      return NextResponse.json({ ok: false, error: `Max ${MAX_LIMIT} photos.` }, { status: 400 });
    }
    if (!photoPlus && photoCount > FREE_LIMIT) {
      return NextResponse.json(
        { ok: false, error: `Photo Plus required for more than ${FREE_LIMIT} photos.` },
        { status: 400 }
      );
    }

    const { baseMonthlyCents, totalCents } = computeCheckoutTotals({
      photoPlus,
      featuredHome,
      termMonths,
    });
    if (baseMonthlyCents <= 0 || totalCents <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid pricing configuration." }, { status: 400 });
    }

    const customId = encodeCheckoutCustomId({
      listingId,
      photoPlus,
      featuredHome,
      termMonths,
    });

    const appOrigin = resolveAppOrigin(req);
    const returnPath = `/checkout/${encodeURIComponent(listingId)}`;
    const returnUrl = `${appOrigin}${returnPath}`;
    const cancelUrl = `${appOrigin}${returnPath}?canceled=1`;

    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: customId,
          description: "SailboatTrade listing upgrades",
          amount: {
            currency_code: "USD",
            value: dollarsFromCents(totalCents),
          },
        },
      ],
      application_context: {
        brand_name: String(process.env.PAYPAL_BRAND_NAME || "SailboatTrade").trim(),
        landing_page: "BILLING",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    };
    const order = await createPayPalOrder(payload);

    if (!order?.id) throw new Error("PayPal did not return an order id.");

    return NextResponse.json({
      ok: true,
      orderId: order.id,
    });
  } catch (e) {
    const issue = String(e?.paypalData?.details?.[0]?.issue || "").trim();
    const description =
      String(e?.paypalData?.details?.[0]?.description || "").trim() ||
      String(e?.message || "").trim() ||
      "Could not create PayPal order.";
    const debugId = String(e?.paypalData?.debug_id || "").trim() || null;

    return NextResponse.json(
      {
        ok: false,
        error: description,
        issue: issue || null,
        debugId,
      },
      { status: Number(e?.httpStatus) || 500 }
    );
  }
}
