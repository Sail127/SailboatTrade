// app/api/listings/[id]/hard-delete/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hard delete:
 * - Only owner can delete
 * - Require listing to be ARCHIVED (prevents accidental nukes)
 * - Blocks delete if billing is ACTIVE/PAST_DUE with a subscription id
 * - Deletes favorites first to avoid FK constraint errors
 *
 * No "type DELETE" confirmation required anymore. UI uses confirm().
 */
export async function POST(req, { params }) {
  try {
    const s = await requireUser().catch(() => null);
    if (!s?.uid) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const id = String(params?.id || "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing listing id." }, { status: 400 });
    }

    const listing = await prisma.listing.findFirst({
      where: { id, ownerId: s.uid },
      select: {
        id: true,
        status: true,
        // ✅ real schema fields only:
        heroImageUrl: true,
        brokerHeroImageUrl: true,
        imageUrls: true,
        billingStatus: true,
        braintreeSubscriptionId: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
    }

    if (listing.status !== "ARCHIVED") {
      return NextResponse.json(
        { ok: false, error: "Please archive the listing first before permanently deleting it." },
        { status: 400 }
      );
    }

    // Prevent deleting listings that still have an active subscription attached
    if (
      (listing.billingStatus === "ACTIVE" || listing.billingStatus === "PAST_DUE") &&
      listing.braintreeSubscriptionId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This listing still has an active billing subscription. Cancel billing first, then try deleting again.",
        },
        { status: 400 }
      );
    }

    // ✅ Avoid FK constraint errors (Favorite references Listing)
    // ✅ Defense-in-depth: delete listing scoped to ownerId too (even after prior check)
    const [favResult, listingResult] = await prisma.$transaction([
      prisma.favorite.deleteMany({ where: { listingId: id } }),
      prisma.listing.deleteMany({ where: { id, ownerId: s.uid } }),
    ]);

    // If another request already deleted it, or anything odd happens, surface a clean error.
    if (!listingResult || listingResult.count !== 1) {
      return NextResponse.json(
        { ok: false, error: "Delete failed (listing not deleted)." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, deletedFavorites: favResult?.count ?? 0 });
  } catch (err) {
    console.error("POST /api/listings/[id]/hard-delete error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Hard delete failed." },
      { status: 500 }
    );
  }
}