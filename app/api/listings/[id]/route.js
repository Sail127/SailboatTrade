// app/api/listings/[id]/route.js
import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma.js";

export const runtime = "nodejs"; // Prisma needs Node runtime (not edge)

const toId = (params) => {
  const raw = params?.id;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
};

export async function GET(_req, { params }) {
  try {
    const id = toId(params);
    if (!id) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error("GET /api/listings/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const id = toId(params);
    if (!id) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const data = await req.json();
    const updated = await prisma.listing.update({ where: { id }, data });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("PUT /api/listings/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const id = toId(params);
    if (!id) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await prisma.listing.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/listings/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
