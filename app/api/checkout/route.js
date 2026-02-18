// app/api/checkout/route.js
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBaseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host");
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (host ? `${proto}://${host}` : "http://localhost:3000")
  );
}

export async function POST(req) {
  const s = await readSession();
  if (!s?.uid) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";
  let listingId = "";
  let plan = "FEATURED_HOME";

  try {
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => null);
      listingId = String(body?.listingId || "").trim();
      plan = String(body?.plan || "FEATURED_HOME").trim();
    } else {
      const fd = await req.formData();
      listingId = String(fd.get("listingId") || "").trim();
      plan = String(fd.get("plan") || "FEATURED_HOME").trim();
    }
  } catch {
    // ignore
  }

  if (!listingId) {
    return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      ownerId: true,
      plan: true,
      paymentStatus: true,
      status: true,
    },
  });

  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  if (listing.ownerId !== s.uid) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  // Don’t create new sessions after successful payment
  if (listing.paymentStatus === "PAID") {
    return NextResponse.redirect(`/checkout/${encodeURIComponent(listing.id)}?success=1`, { status: 303 });
  }

  const planUpper = String(plan || "").toUpperCase();
  const desiredPlan = planUpper === "STANDARD" ? "STANDARD" : "FEATURED_HOME";

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY env var" }, { status: 500 });

  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });

  const baseUrl = getBaseUrl();
  const successUrl = `${baseUrl}/checkout/${encodeURIComponent(listing.id)}?success=1&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/checkout/${encodeURIComponent(listing.id)}?canceled=1`;

  // Pricing (prefer Stripe Price IDs)
  const featuredPriceId = process.env.STRIPE_FEATURED_HOME_PRICE_ID || "";
  const standardPriceId = process.env.STRIPE_STANDARD_PRICE_ID || "";

  const featuredCents = Number.parseInt(process.env.FEATURED_HOME_PRICE_USD_CENTS || "", 10);
  const standardCents = Number.parseInt(process.env.STANDARD_PRICE_USD_CENTS || "", 10);

  const featuredUnitAmount = Number.isFinite(featuredCents) && featuredCents > 0 ? featuredCents : 9900; // $99 default
  const standardUnitAmount = Number.isFinite(standardCents) && standardCents > 0 ? standardCents : 4900;  // $49 default

  const lineItem =
    desiredPlan === "STANDARD"
      ? (standardPriceId
          ? { price: standardPriceId, quantity: 1 }
          : {
              price_data: {
                currency: "usd",
                product_data: { name: "SailboatTrade — Standard Listing" },
                unit_amount: standardUnitAmount,
              },
              quantity: 1,
            })
      : (featuredPriceId
          ? { price: featuredPriceId, quantity: 1 }
          : {
              price_data: {
                currency: "usd",
                product_data: { name: "SailboatTrade — Featured on Homepage" },
                unit_amount: featuredUnitAmount,
              },
              quantity: 1,
            });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [lineItem],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      listingId: listing.id,
      uid: s.uid,
      plan: desiredPlan,
    },
  });

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      plan: desiredPlan,
      paymentProvider: "STRIPE",
      paymentStatus: "PENDING",
      paymentSessionId: session.id,

      // ✅ Recommended: reflect that checkout has been initiated
      status: "READY_FOR_CHECKOUT",
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe session missing URL" }, { status: 500 });
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
