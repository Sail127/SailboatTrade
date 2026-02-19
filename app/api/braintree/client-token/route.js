// app/api/braintree/client-token/route.js
import { NextResponse } from "next/server";
import { getBraintreeGateway } from "@/lib/braintree";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readSession();
  if (!s?.uid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const gateway = getBraintreeGateway();
  const { clientToken } = await gateway.clientToken.generate({});
  return NextResponse.json({ clientToken });
}
