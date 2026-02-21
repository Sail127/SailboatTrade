// app/api/braintree/client-token/route.js
import { NextResponse } from "next/server";
import { getBraintreeGateway } from "@/lib/braintree";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readSession();
  if (!s?.uid) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  try {
    const gateway = getBraintreeGateway();
    const { clientToken } = await gateway.clientToken.generate({});
    return NextResponse.json({ ok: true, clientToken });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to generate client token." },
      { status: 500 }
    );
  }
}
