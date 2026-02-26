// app/api/billing/braintree/webhook/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getBraintreeGateway } from "@/lib/braintree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toBillingStatus(raw) {
  const s = String(raw || "").toUpperCase();
  if (s === "ACTIVE") return "ACTIVE";
  if (s === "PAST_DUE") return "PAST_DUE";
  if (s === "CANCELED" || s === "CANCELLED") return "CANCELED";
  return "PAST_DUE";
}

export async function POST(req) {
  try {
    const raw = await req.text();
    const params = new URLSearchParams(raw);

    const signature = params.get("bt_signature");
    const payload = params.get("bt_payload");

    if (!signature || !payload) {
      return NextResponse.json({ ok: false, error: "Missing webhook payload." }, { status: 400 });
    }

    const gateway = getBraintreeGateway();

    const note = await gateway.webhookNotification.parse(signature, payload);

    const subId =
      note?.subscription?.id ||
      note?.subscription?.subscriptionId ||
      note?.subject?.subscription?.id ||
      note?.subject?.id ||
      null;

    if (!subId) {
      // Not subscription-related; ignore safely
      return NextResponse.json({ ok: true });
    }

    // Fetch latest subscription state
    const sub = await gateway.subscription.find(subId).catch(() => null);
    if (!sub) return NextResponse.json({ ok: true });

    const status = toBillingStatus(sub?.status);
    const periodStart = sub?.billingPeriodStartDate ? new Date(sub.billingPeriodStartDate) : null;
    const periodEnd = sub?.billingPeriodEndDate ? new Date(sub.billingPeriodEndDate) : null;

    const now = new Date();

    const listings = await prisma.listing.findMany({
      where: { braintreeSubscriptionId: subId },
      select: { id: true, billingAutoRenew: true, billingTermMonths: true },
    });

    for (const l of listings) {
      const termMonths = Number(l.billingTermMonths || 1);
      const nextExpiresAt = l.billingAutoRenew && status === "ACTIVE" ? addMonths(now, termMonths) : undefined;

      await prisma.listing.update({
        where: { id: l.id },
        data: {
          billingStatus: status,
          billingCurrentPeriodStart: periodStart,
          billingCurrentPeriodEnd: periodEnd,
          expiresAt: nextExpiresAt,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/billing/braintree/webhook error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
