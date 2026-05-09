import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/requestSecurity";
import { ensurePayPalSubscriptionPlan } from "@/lib/paypalSubscriptions";
import {
  FREE_LIMIT,
  MAX_LIMIT,
  computeCheckoutTotals,
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

export async function POST(req) {
  try {
    if (!isTrustedOrigin(req)) {
      return NextResponse.json({ ok: false, error: "Invalid origin." }, { status: 403 });
    }

    const rl = await rateLimit({
      key: makeRateLimitKey(req, "paypal_subscription_prepare"),
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
        imageUrls: true,
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

    const totals = computeCheckoutTotals({
      photoPlus,
      featuredHome,
      termMonths,
    });
    if (totals.totalCents <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid pricing configuration." }, { status: 400 });
    }

    const plan = await ensurePayPalSubscriptionPlan({
      photoPlus,
      featuredHome,
      termMonths,
      totalCents: totals.totalCents,
      currency: "USD",
    });

    return NextResponse.json({
      ok: true,
      planId: plan.planId,
      customId: encodeCheckoutCustomId({
        listingId,
        photoPlus,
        featuredHome,
        termMonths,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Could not prepare PayPal subscription." },
      { status: Number(e?.httpStatus) || 500 }
    );
  }
}
