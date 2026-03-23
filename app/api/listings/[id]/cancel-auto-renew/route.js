import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { suspendPayPalSubscription } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req, { params }) {
  const s = await requireUser().catch(() => null);
  if (!s?.uid) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const id = String(params?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });

  const listing = await prisma.listing.findFirst({
    where: { id, ownerId: s.uid },
    select: {
      id: true,
      billingStatus: true,
      billingAutoRenew: true,
      cancelAtPeriodEnd: true,
      billingSubscriptionId: true,
      billingCurrentPeriodEnd: true,
    },
  });

  if (!listing) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  if (!listing.billingAutoRenew || !listing.billingSubscriptionId) {
    return NextResponse.json({ ok: true, alreadyCanceled: true });
  }

  await suspendPayPalSubscription(listing.billingSubscriptionId, "Customer canceled auto-renew.");

  const now = new Date();
  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      billingAutoRenew: false,
      cancelAtPeriodEnd: true,
      canceledAt: now,
    },
  });

  return NextResponse.json({
    ok: true,
    billingStatus: String(listing.billingStatus || "ACTIVE"),
    cancelAtPeriodEnd: true,
    billingAutoRenew: false,
    currentPeriodEnd: listing.billingCurrentPeriodEnd ? listing.billingCurrentPeriodEnd.toISOString() : null,
  });
}
