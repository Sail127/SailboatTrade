// app/api/listings/[id]/hard-delete/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getR2, getR2Bucket } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSafeR2Key(key) {
  const s = String(key || "").trim();
  if (!s) return false;
  if (s.startsWith("/") || s.startsWith("\\") || s.startsWith("http://") || s.startsWith("https://")) return false;
  if (s.startsWith("data:")) return false;
  if (s.includes("..")) return false;
  return true;
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const v of arr || []) {
    const s = String(v || "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

async function deleteR2Keys(keys) {
  const safeKeys = uniq(keys).filter(isSafeR2Key);
  if (safeKeys.length === 0) return { attempted: 0, deleted: 0 };

  const r2 = getR2();
  const Bucket = getR2Bucket();

  let deletedTotal = 0;
  for (let i = 0; i < safeKeys.length; i += 1000) {
    const chunk = safeKeys.slice(i, i + 1000);
    const resp = await r2.send(
      new DeleteObjectsCommand({
        Bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      })
    );

    const errors = Array.isArray(resp?.Errors) ? resp.Errors : [];
    if (errors.length) {
      const firstFew = errors.slice(0, 8).map((e) => ({
        key: e?.Key,
        code: e?.Code,
        message: e?.Message,
      }));
      const err = new Error("R2 delete failed for one or more objects.");
      err.details = firstFew;
      throw err;
    }

    deletedTotal += chunk.length;
  }

  return { attempted: safeKeys.length, deleted: deletedTotal };
}

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

    const keysToDelete = uniq([
      listing.heroImageUrl,
      listing.brokerHeroImageUrl,
      ...(Array.isArray(listing.imageUrls) ? listing.imageUrls : []),
    ]);

    if (keysToDelete.length) {
      await deleteR2Keys(keysToDelete);
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
