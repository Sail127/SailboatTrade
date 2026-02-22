// app/api/listings/[id]/restore/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Restore listing:
 * - Owner-only
 * - Only ARCHIVED listings can be restored
 * - Restores status to DRAFT
 *
 * NOTE: If you’re using the “archive deletes photos except hero” behavior,
 * restoring will NOT bring back deleted photos. The listing will still have
 * only the hero image in imageUrls.
 */
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
    select: { id: true, status: true, heroImageUrl: true, imageUrls: true },
  });

  if (!listing) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const status = String(listing.status || "").toUpperCase();

  // If an admin removed it, don’t let the owner restore it.
  if (status === "REMOVED") {
    return NextResponse.json({ ok: false, error: "This listing was removed by an admin." }, { status: 403 });
  }

  if (status !== "ARCHIVED") {
    return NextResponse.json({ ok: false, error: "Only archived listings can be restored." }, { status: 400 });
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      status: "DRAFT",
      // Keep archived safety: restored drafts should never be featured automatically
      featuredHome: false,
    },
  });

  const hero = String(listing.heroImageUrl || "").trim();
  const imgs = Array.isArray(listing.imageUrls) ? listing.imageUrls : [];
  const hasOnlyHero = hero ? imgs.length === 1 && String(imgs[0] || "").trim() === hero : imgs.length === 0;

  return NextResponse.json({
    ok: true,
    listing: updated,
    warning: hasOnlyHero
      ? "This listing was archived with photo cleanup enabled. Only the hero image remains; other photos were deleted to reduce storage costs."
      : null,
  });
}