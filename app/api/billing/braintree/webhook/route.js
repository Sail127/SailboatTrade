// app/api/billing/braintree/webhook/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getBraintreeGateway, getBraintreePlanIds } from "@/lib/braintree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function endOfDayUtcFromDateOnly(d) {
  const [y, m, day] = String(d || "").split("-").map((x) => Number(x));
  if (!y || !m || !day) return null;
  return new Date(Date.UTC(y, m - 1, day, 23, 59, 59, 999));
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

    const paidThrough = endOfDayUtcFromDateOnly(sub?.paidThroughDate);
    const status = String(sub?.status || "");

    // Determine whether featured add-on is present (if you configured it)
    const { featuredAddonId: addonId } = getBraintreePlanIds();
    const hasFeaturedAddon =
      addonId && Array.isArray(sub?.addOns)
        ? sub.addOns.some((a) => String(a?.id || a?.addOnId || "") === addonId && Number(a?.quantity || 1) > 0)
        : false;

    const now = new Date();

    await prisma.listing.updateMany({
      where: { braintreeSubscriptionId: subId },
      data: {
        subscriptionStatus: status,
        standardUntil: paidThrough || null,
        featuredHomeUntil: hasFeaturedAddon ? (paidThrough || null) : null,
        featuredHomeEnabled: hasFeaturedAddon,

        // If paid-through has expired, downgrade plan
        plan: paidThrough && paidThrough > now ? "STANDARD" : "FREE",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/billing/braintree/webhook error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}