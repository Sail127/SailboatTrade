// app/api/cron/cleanup-drafts/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
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
      const firstFew = errors.slice(0, 10).map((e) => ({
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

export async function GET(req) {
  try {
    const url = new URL(req.url);

    // ✅ Protect cron endpoint
    const secret = url.searchParams.get("secret") || req.headers.get("x-cron-secret") || "";
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const days = Number(process.env.DRAFT_CLEANUP_DAYS || "7");
    const cutoffMs = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;

    // ✅ Build reference set from DB so we never delete something still used
    const [listings, users] = await Promise.all([
      prisma.listing.findMany({
        select: { heroImageUrl: true, brokerHeroImageUrl: true, imageUrls: true },
      }),
      prisma.user.findMany({
        select: { brokerHeroImageUrl: true },
      }),
    ]);

    const referenced = new Set();

    for (const l of listings) {
      if (l.heroImageUrl) referenced.add(String(l.heroImageUrl));
      if (l.brokerHeroImageUrl) referenced.add(String(l.brokerHeroImageUrl));
      if (Array.isArray(l.imageUrls)) {
        for (const k of l.imageUrls) if (k) referenced.add(String(k));
      }
    }

    for (const u of users) {
      if (u.brokerHeroImageUrl) referenced.add(String(u.brokerHeroImageUrl));
    }

    // ✅ List objects under drafts/
    const r2 = getR2();
    const Bucket = getR2Bucket();

    let ContinuationToken = undefined;
    const candidates = [];

    while (true) {
      const resp = await r2.send(
        new ListObjectsV2Command({
          Bucket,
          Prefix: "drafts/",
          ContinuationToken,
          MaxKeys: 1000,
        })
      );

      const contents = Array.isArray(resp?.Contents) ? resp.Contents : [];
      for (const obj of contents) {
        const key = String(obj?.Key || "");
        if (!key) continue;
        if (!isSafeR2Key(key)) continue;

        const lastMod = obj?.LastModified ? new Date(obj.LastModified).getTime() : 0;
        if (!lastMod || lastMod > cutoffMs) continue;          // too recent
        if (referenced.has(key)) continue;                      // still referenced

        candidates.push(key);
      }

      if (!resp?.IsTruncated) break;
      ContinuationToken = resp?.NextContinuationToken;
      if (!ContinuationToken) break;
    }

    // ✅ Delete unreferenced old drafts
    let storage = { attempted: 0, deleted: 0 };
    if (candidates.length) {
      storage = await deleteR2Keys(candidates);
    }

    return NextResponse.json({
      ok: true,
      cutoffDays: Math.max(1, days),
      scannedPrefix: "drafts/",
      deletions: storage,
      candidatesFound: candidates.length,
    });
  } catch (err) {
    console.error("GET /api/cron/cleanup-drafts error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Cleanup failed.", detail: err?.details || undefined },
      { status: 500 }
    );
  }
}