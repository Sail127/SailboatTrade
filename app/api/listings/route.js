// app/api/listings/route.js
import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const listings = await prisma.listing.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(listings);
  } catch (error) {
    console.error("GET /api/listings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
