// app/api/billing/braintree/token/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getBraintreeGateway } from "@/lib/braintree";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const s = await requireUser().catch(() => null);
    if (!s?.uid) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

    const rl = rateLimit({
      key: makeRateLimitKey(req, "braintree_token", s.uid),
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many token requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: s.uid },
      select: { id: true, email: true, deletedAt: true, isDisabled: true, braintreeCustomerId: true },
    });

    if (!user || user.deletedAt || user.isDisabled) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const gateway = getBraintreeGateway();
    let customerId = user.braintreeCustomerId;

    // Ensure a customer-backed token so PayPal vault flow can be shown in Drop-in.
    if (!customerId) {
      const cr = await gateway.customer.create({ email: user.email });
      if (!cr?.success) throw new Error(cr?.message || "Could not create customer.");
      customerId = cr.customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { braintreeCustomerId: customerId },
      });
    }

    const result = await gateway.clientToken.generate({ customerId });

    return NextResponse.json({ ok: true, clientToken: result.clientToken });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Could not create client token." }, { status: 500 });
  }
}
