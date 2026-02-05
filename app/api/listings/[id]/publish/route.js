// app/api/listings/[id]/publish/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
    }

    const token = req.headers.get("x-admin-token") || "";
    const expected = process.env.PUBLISH_ADMIN_TOKEN || "";

    if (!expected || token !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("POST /api/listings/[id]/publish error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
