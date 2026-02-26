import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req) {
  const s = await requireUser().catch(() => null);
  if (!s?.uid) {
    return NextResponse.json(
      { ok: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const listingId = String(body?.listingId || "").trim();
  if (!listingId) {
    return NextResponse.json(
      { ok: false, error: "listingId required" },
      { status: 400 }
    );
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true },
  });
  if (!listing) {
    return NextResponse.json(
      { ok: false, error: "Listing not found" },
      { status: 404 }
    );
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId: s.uid, listingId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, favorited: false });
  }

  await prisma.favorite.create({ data: { userId: s.uid, listingId } });
  return NextResponse.json({ ok: true, favorited: true });
}
