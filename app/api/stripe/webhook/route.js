// app/api/stripe/webhook/route.js
import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

export async function POST(req) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ ok: false, error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }
  if (!webhookSecret) {
    return NextResponse.json({ ok: false, error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ ok: false, error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Webhook signature failed: ${err?.message || "bad sig"}` },
      { status: 400 }
    );
  }

  async function markPaid(session) {
    const listingId = String(session?.metadata?.listingId || "").trim();
    if (!listingId) return;

    const paid =
      session?.payment_status === "paid" ||
      session?.payment_status === "no_payment_required";

    if (!paid) return;

    const planRaw = String(session?.metadata?.plan || "").toUpperCase().trim();
    const desiredPlan = planRaw === "FEATURED_HOME" ? "FEATURED_HOME" : "STANDARD";
    const sessionId = String(session?.id || "").trim();

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        paymentSessionId: true,
        paymentStatus: true,
        status: true,
      },
    });

    if (!listing) return;

    // If you stored a paymentSessionId when creating checkout, enforce it here
    if (listing.paymentSessionId && sessionId && listing.paymentSessionId !== sessionId) {
      return; // ignore mismatched/old session
    }

    // Idempotent: do nothing if already paid
    if (listing.paymentStatus === "PAID") return;

    await prisma.listing.update({
      where: { id: listingId },
      data: {
        plan: desiredPlan,
        paymentProvider: "STRIPE",
        paymentSessionId: sessionId || listing.paymentSessionId || null,
        paymentStatus: "PAID",
        paidAt: new Date(),

        // ✅ Admin gate after payment
        status: "PENDING_REVIEW",
        submittedForReviewAt: new Date(),
      },
    });
  }

  async function markFailed(session) {
    const listingId = String(session?.metadata?.listingId || "").trim();
    if (!listingId) return;

    const sessionId = String(session?.id || "").trim();

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, paymentSessionId: true, paymentStatus: true },
    });

    if (!listing) return;

    // Don’t overwrite a successful payment
    if (listing.paymentStatus === "PAID") return;

    // Enforce match if we have a stored session id
    if (listing.paymentSessionId && sessionId && listing.paymentSessionId !== sessionId) {
      return;
    }

    await prisma.listing.update({
      where: { id: listingId },
      data: { paymentStatus: "FAILED" },
    });
  }

  try {
    // Typical card flow
    if (event.type === "checkout.session.completed") {
      await markPaid(event.data.object);
    }

    // Some payment methods complete asynchronously
    if (event.type === "checkout.session.async_payment_succeeded") {
      await markPaid(event.data.object);
    }

    if (event.type === "checkout.session.async_payment_failed") {
      await markFailed(event.data.object);
    }

    if (event.type === "checkout.session.expired") {
      await markFailed(event.data.object);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}
