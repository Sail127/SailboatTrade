// app/api/cron/cleanup-archived-photos/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getR2, getR2Bucket } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRACE_DAYS = 30;
const MAX_LISTINGS_PER_RUN = 200;
const MAX_DELETE_PER_RUN = 10000;

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
    if (deletedTotal >= MAX_DELETE_PER_RUN) break;
  }

  return { attempted: Math.min(safeKeys.length, MAX_DELETE_PER_RUN), deleted: deletedTotal };
}

export async function GET(req) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || "";
  const expected = String(process.env.CRON_SECRET || "").trim();

  if (!isVercelCron && (!expected || secret !== expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - GRACE_DAYS * 24 * 60 * 60 * 1000);

    const listings = await prisma.listing.findMany({
      where: {
        status: "ARCHIVED",
        archivedAt: { not: null, lt: cutoff },
        archivedImagesPrunedAt: null,
      },
      take: MAX_LISTINGS_PER_RUN,
      select: { id: true, heroImageUrl: true, imageUrls: true },
    });

    let deletedObjects = 0;
    let attemptedObjects = 0;
    let prunedListings = 0;

    for (const l of listings) {
      const hero = String(l.heroImageUrl || "").trim() || null;
      const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
      const keysToDelete = uniq(imgs)
        .map((k) => String(k || "").trim())
        .filter(Boolean)
        .filter((k) => (hero ? k !== hero : true));

      if (keysToDelete.length) {
        const r = await deleteR2Keys(keysToDelete);
        deletedObjects += r.deleted;
        attemptedObjects += r.attempted;
      }

      const nextImageUrls = hero ? [hero] : [];

      await prisma.listing.update({
        where: { id: l.id },
        data: {
          imageUrls: nextImageUrls,
          archivedImagesPrunedAt: now,
        },
      });

      prunedListings += 1;
      if (deletedObjects >= MAX_DELETE_PER_RUN) break;
    }

    return NextResponse.json({
      ok: true,
      now: now.toISOString(),
      cutoff: cutoff.toISOString(),
      listingsScanned: listings.length,
      listingsPruned: prunedListings,
      deletions: { attempted: attemptedObjects, deleted: deletedObjects },
      limited: deletedObjects >= MAX_DELETE_PER_RUN || listings.length >= MAX_LISTINGS_PER_RUN,
    });
  } catch (e) {
    console.error("cron/cleanup-archived-photos failed:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Cron failed." }, { status: 500 });
  }
}
