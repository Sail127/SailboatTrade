// app/api/listings/[id]/archive/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const s = await requireUser().catch(() => null);
  if (!s?.uid) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing listing id." }, { status: 400 });
  }

  const listing = await prisma.listing.findFirst({
    where: { id, ownerId: s.uid },
    select: { id: true, status: true },
  });

  if (!listing) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const status = String(listing.status || "").toUpperCase();
  if (status === "REMOVED") {
    return NextResponse.json({ ok: false, error: "This listing was removed by an admin." }, { status: 403 });
  }

  const now = new Date();

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      status: "ARCHIVED",
      featuredHome: false,
      archivedAt: now,
      archivedImagesPrunedAt: null,
    },
  });

  return NextResponse.json({
    ok: true,
    listing: updated,
    note: "Archived. Photos remain for 30 days before non-hero images are removed.",
  });
}
