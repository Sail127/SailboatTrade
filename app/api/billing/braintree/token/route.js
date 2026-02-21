// app/api/billing/braintree/token/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getBraintreeGateway } from "@/lib/braintree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await requireUser().catch(() => null);
    if (!s?.uid) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: s.uid },
      select: { id: true, email: true, deletedAt: true, isDisabled: true, braintreeCustomerId: true },
    });

    if (!user || user.deletedAt || user.isDisabled) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const gateway = getBraintreeGateway();

    const result = await gateway.clientToken.generate(
      user.braintreeCustomerId ? { customerId: user.braintreeCustomerId } : {}
    );

    return NextResponse.json({ ok: true, clientToken: result.clientToken });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Could not create client token." }, { status: 500 });
  }
}