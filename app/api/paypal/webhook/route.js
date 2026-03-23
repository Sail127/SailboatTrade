import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPayPalSubscription, verifyPayPalWebhookSignature } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeSubscriptionId(body) {
  const resource = body?.resource || {};
  return String(resource?.id || resource?.billing_agreement_id || "").trim();
}

async function syncFromSubscription(subscriptionId) {
  if (!subscriptionId) return;
  const listing = await prisma.listing.findFirst({
    where: { billingSubscriptionId: subscriptionId },
    select: { id: true },
  });
  if (!listing) return;

  const subscription = await getPayPalSubscription(subscriptionId).catch(() => null);
  if (!subscription) return;

  const status = String(subscription?.status || "").toUpperCase();
  const nextBillingTime = parseDate(subscription?.billing_info?.next_billing_time);
  const startTime = parseDate(subscription?.start_time);
  const canceledAt = parseDate(subscription?.status_update_time);

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      billingStatus:
        status === "ACTIVE"
          ? "ACTIVE"
          : status === "SUSPENDED"
          ? "ACTIVE"
          : status === "CANCELLED" || status === "EXPIRED"
          ? "CANCELED"
          : "PAST_DUE",
      billingCurrentPeriodStart: startTime ?? undefined,
      billingCurrentPeriodEnd: nextBillingTime,
      cancelAtPeriodEnd: status === "SUSPENDED" || status === "CANCELLED" || status === "EXPIRED",
      canceledAt:
        status === "SUSPENDED" || status === "CANCELLED" || status === "EXPIRED"
          ? canceledAt || new Date()
          : null,
      billingAutoRenew: status === "ACTIVE",
      billingPlanId: String(subscription?.plan_id || "").trim() || null,
      expiresAt: status === "ACTIVE" || status === "SUSPENDED" ? nextBillingTime : undefined,
    },
  });
}

export async function POST(req) {
  const webhookId = String(process.env.PAYPAL_WEBHOOK_ID || "").trim();
  if (!webhookId) {
    return NextResponse.json({ ok: false, error: "Missing PAYPAL_WEBHOOK_ID." }, { status: 500 });
  }

  const rawBody = await req.text();
  const body = (() => {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  })();
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const verification = await verifyPayPalWebhookSignature({
      authAlgo: req.headers.get("paypal-auth-algo"),
      certUrl: req.headers.get("paypal-cert-url"),
      transmissionId: req.headers.get("paypal-transmission-id"),
      transmissionSig: req.headers.get("paypal-transmission-sig"),
      transmissionTime: req.headers.get("paypal-transmission-time"),
      webhookId,
      webhookEvent: body,
    });

    if (String(verification?.verification_status || "").toUpperCase() !== "SUCCESS") {
      return NextResponse.json({ ok: false, error: "Invalid PayPal signature." }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Could not verify PayPal webhook." },
      { status: 401 }
    );
  }

  const eventType = String(body?.event_type || "").toUpperCase();
  const subscriptionId = normalizeSubscriptionId(body);

  try {
    if (
      eventType === "BILLING.SUBSCRIPTION.ACTIVATED" ||
      eventType === "BILLING.SUBSCRIPTION.UPDATED" ||
      eventType === "BILLING.SUBSCRIPTION.CANCELLED" ||
      eventType === "BILLING.SUBSCRIPTION.EXPIRED" ||
      eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
      eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED" ||
      eventType === "PAYMENT.SALE.COMPLETED"
    ) {
      await syncFromSubscription(subscriptionId);
    }
  } catch (error) {
    console.error("PayPal webhook sync failed", {
      eventType,
      subscriptionId,
      error: error?.message || String(error),
    });
  }

  return NextResponse.json({ ok: true });
}
