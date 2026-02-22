// app/api/listings/[id]/archive/route.js
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

  // don't attempt to delete public/static paths or external urls
  if (s.startsWith("/") || s.startsWith("\\") || s.startsWith("http://") || s.startsWith("https://")) return false;
  if (s.startsWith("data:")) return false;

  // traversal guard
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

  // DeleteObjects supports up to 1000 keys per request
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

    // With Quiet=true, Deleted may be empty even on success; assume chunk ok if no errors
    deletedTotal += chunk.length;
  }

  return { attempted: safeKeys.length, deleted: deletedTotal };
}

export async function POST(req, { params }) {
  // ✅ Auth (reconciled + simplified)
  const s = await requireUser().catch(() => null);
  if (!s?.uid) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing listing id." }, { status: 400 });
  }

  // ✅ Load listing + images needed for cleanup
  const listing = await prisma.listing.findFirst({
    where: { id, ownerId: s.uid },
    select: {
      id: true,
      status: true,
      heroImageUrl: true,
      imageUrls: true,
      featuredHome: true,
    },
  });

  if (!listing) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const status = String(listing.status || "").toUpperCase();
  if (status === "REMOVED") {
    return NextResponse.json({ ok: false, error: "This listing was removed by an admin." }, { status: 403 });
  }

  const hero = String(listing.heroImageUrl || "").trim() || null;
  const imgs = Array.isArray(listing.imageUrls) ? listing.imageUrls : [];

  // ✅ Delete all listing photos except hero
  const keysToDelete = uniq(imgs)
    .map((k) => String(k || "").trim())
    .filter(Boolean)
    .filter((k) => (hero ? k !== hero : true));

  // Best-effort storage cleanup:
  // - We STILL archive even if deletion fails (better UX)
  // - But we report a warning so you can see it in logs/UI
  let storage = { attempted: 0, deleted: 0, warning: null };
  try {
    const r = await deleteR2Keys(keysToDelete);
    storage = { ...r, warning: null };
  } catch (e) {
    console.error("Archive R2 cleanup failed:", e?.details || e);
    storage = {
      attempted: keysToDelete.length,
      deleted: 0,
      warning: "Archived, but some images could not be deleted from storage. Try again.",
      detail: e?.details || undefined,
    };
  }

  // ✅ Keep only hero in DB to avoid broken images (since we deleted the rest)
  const nextImageUrls = hero ? [hero] : [];

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      status: "ARCHIVED",
      featuredHome: false, // archived listings should never be featured
      heroImageUrl: hero,
      imageUrls: nextImageUrls,
    },
  });

  return NextResponse.json({ ok: true, listing: updated, storage });
}