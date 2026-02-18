// app/api/inquiries/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const listingId = body?.listingId;
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const phone = String(body?.phone || "").trim();
    const message = String(body?.message || "").trim();

    if (!listingId || !name || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Fetch listing + seller contact (not displayed publicly)
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        contactEmail: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    // ✅ MVP: store nothing for now; just acknowledge.
    // Next step (when ready): create a proper internal message thread model.
    // You can also send an email notification to the seller here if desired.

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/inquiries error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
