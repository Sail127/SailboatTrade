// app/api/braintree/checkout/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";
import { getBraintreeGateway } from "@/lib/braintree";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dollarsFromCents(cents, fallbackCents) {
  const v = Number.parseInt(String(cents || ""), 10);
  const safe = Number.isFinite(v) && v > 0 ? v : fallbackCents;
  return (safe / 100).toFixed(2);
}

function shouldAutoPublish() {
  const env = (process.env.BRAINTREE_ENVIRONMENT || "sandbox").toLowerCase();
  const flag = String(process.env.PAYMENTS_SANDBOX_AUTO_PUBLISH || "").trim();
  return env === "sandbox" && (flag === "1" || flag.toLowerCase() === "true");
}

export async function POST(req) {
  const s = await readSession();
  if (!s?.uid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const listingId = String(body?.listingId || "").trim();
  const nonce = String(body?.nonce || "").trim();
  const plan = String(body?.plan || "").toUpperCase().trim() || "FEATURED_HOME";

  if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
  if (!nonce) return NextResponse.json({ error: "Missing nonce" }, { status: 400 });

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      ownerId: true,
      plan: true,
      paymentStatus: true,
      status: true,
      previewToken: true, // used for preview link
    },
  });

  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  if (listing.ownerId !== s.uid) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  // Idempotent
  if (listing.paymentStatus === "PAID") {
    return NextResponse.json({
      ok: true,
      alreadyPaid: true,
      redirect: `/checkout/${encodeURIComponent(listing.id)}?success=1`,
    });
  }

  const desiredPlan = plan === "STANDARD" ? "STANDARD" : "FEATURED_HOME";

  const featuredAmount = dollarsFromCents(process.env.FEATURED_HOME_PRICE_USD_CENTS, 9900);
  const standardAmount = dollarsFromCents(process.env.STANDARD_PRICE_USD_CENTS, 4900);
  const amount = desiredPlan === "STANDARD" ? standardAmount : featuredAmount;

  const gateway = getBraintreeGateway();

  const result = await gateway.transaction.sale({
    amount,
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

  const tx = result.transaction;
  const now = new Date();

  const autoPublish = shouldAutoPublish();
  const nextStatus = autoPublish ? "PUBLISHED" : "PENDING_REVIEW";

  // Ensure preview token exists (so user can safely preview while not public)
  const previewToken = listing.previewToken || crypto.randomUUID();

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      plan: desiredPlan,
      paymentProvider: "BRAINTREE",
      paymentStatus: "PAID",
      paymentSessionId: tx?.id || null, // reuse for now; later consider paymentTransactionId
      paidAt: now,

      // Keep your intended workflow:
      status: nextStatus,
      submittedForReviewAt: autoPublish ? null : now,

      previewToken,
    },
  });

  return NextResponse.json({
    ok: true,
    transactionId: tx?.id || null,
    autoPublished: autoPublish,
    previewToken,
    redirect: `/checkout/${encodeURIComponent(listing.id)}?success=1`,
  });
}
