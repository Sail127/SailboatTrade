// app/api/billing/braintree/cancel/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getBraintreeGateway } from "@/lib/braintree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const s = await requireUser().catch(() => null);
    if (!s?.uid) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const listingId = String(body?.listingId || "").trim();
    if (!listingId) return NextResponse.json({ ok: false, error: "Missing listingId." }, { status: 400 });

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerId: true, braintreeSubscriptionId: true },
    });

    if (!listing || listing.ownerId !== s.uid) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    if (!listing.braintreeSubscriptionId) {
      return NextResponse.json({ ok: false, error: "No subscription to cancel." }, { status: 400 });
    }

    const gateway = getBraintreeGateway();
    const result = await gateway.subscription.cancel(listing.braintreeSubscriptionId);
    if (!result?.success) throw new Error(result?.message || "Cancel failed.");

    const sub = result.subscription;

    await prisma.listing.update({
      where: { id: listingId },
      data: {
        billingStatus: "CANCELED",
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
        billingCurrentPeriodEnd: sub?.billingPeriodEndDate ? new Date(sub.billingPeriodEndDate) : undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Could not cancel subscription." }, { status: 500 });
  }
}