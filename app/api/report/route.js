// app/api/report/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const listingId = body?.listingId;
    const reason = String(body?.reason || "").trim();
    const details = String(body?.details || "").trim();

    if (!listingId || !reason) {
      return NextResponse.json(
        { error: "Missing listingId or reason." },
        { status: 400 }
      );
    }

    // ✅ MVP: log only. Next step: store in DB + notify admin.
    console.log("REPORT LISTING", { listingId, reason, details });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/report error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
