// app/api/admin/cleanup-drafts/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi, audit } from "@/lib/admin";
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getR2, getR2Bucket } from "@/lib/r2";
import { DRAFT_UPLOAD_TTL_MINUTES, getDraftUploadCutoffDate } from "@/lib/draftUploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Safety cap so one click can't nuke your entire bucket
const MAX_DELETE_PER_RUN = 10000;

function clampMinutes(n) {
  if (!Number.isFinite(n)) return DRAFT_UPLOAD_TTL_MINUTES;
  if (n < 1) return 1;
  if (n > 60 * 24 * 90) return 60 * 24 * 90;
  return Math.floor(n);
}

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

    // Quiet=true can return empty Deleted array even if successful
    deletedTotal += chunk.length;
  }

  return { attempted: safeKeys.length, deleted: deletedTotal };
}

export async function POST(req) {
  try {
    // ✅ ADMIN only (destructive tool)
    const guard = await requireAdminApi("MODERATOR");
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status || 403 });
    }

    const body = await req.json().catch(() => ({}));
    const fallbackMinutes =
      Number(process.env.DRAFT_CLEANUP_MINUTES || Number(process.env.DRAFT_CLEANUP_DAYS || 0) * 24 * 60 || DRAFT_UPLOAD_TTL_MINUTES);
    const requestedMinutes =
      body?.minutes != null
        ? Number(body.minutes)
        : body?.days != null
          ? Number(body.days) * 24 * 60
          : fallbackMinutes;
    const minutes = clampMinutes(requestedMinutes);
    const dryRun = Boolean(body?.dryRun ?? true);

    const cutoffDate = getDraftUploadCutoffDate(minutes);
    const cutoffMs = cutoffDate.getTime();

    // ✅ Build reference + draft tracking sets so we never delete anything still used
    const [listings, users, unclaimedDraftUploads] = await Promise.all([
      prisma.listing.findMany({
        select: { heroImageUrl: true, brokerHeroImageUrl: true, imageUrls: true },
      }),
      prisma.user.findMany({
        select: { brokerHeroImageUrl: true },
      }),
      prisma.draftUpload.findMany({
        where: { claimedAt: null },
        select: { key: true, lastTouchedAt: true },
      }),
    ]);
    const referenced = new Set();
    const trackedDraftKeys = new Set();
    const staleTrackedDraftKeys = new Set();

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

    for (const row of unclaimedDraftUploads) {
      const key = String(row?.key || "");
      if (!key) continue;
      trackedDraftKeys.add(key);
      const lastTouchedAt = row?.lastTouchedAt ? new Date(row.lastTouchedAt).getTime() : 0;
      if (lastTouchedAt && lastTouchedAt <= cutoffMs) staleTrackedDraftKeys.add(key);
    }

    // ✅ List objects under drafts/
    const r2 = getR2();
    const Bucket = getR2Bucket();

    let ContinuationToken = undefined;
    const candidates = [];
    let scanned = 0;

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
      scanned += contents.length;

      for (const obj of contents) {
        const key = String(obj?.Key || "");
        if (!key || !isSafeR2Key(key)) continue;

        const lastMod = obj?.LastModified ? new Date(obj.LastModified).getTime() : 0;
        const isTracked = trackedDraftKeys.has(key);
        const isStaleTracked = staleTrackedDraftKeys.has(key);

        if (referenced.has(key)) continue; // still referenced by listing/user
        if (isTracked && !isStaleTracked) continue; // active draft photo
        if (!isTracked && (!lastMod || lastMod > cutoffMs)) continue; // legacy untracked draft still recent

        candidates.push(key);
        if (candidates.length >= MAX_DELETE_PER_RUN) break;
      }

      if (candidates.length >= MAX_DELETE_PER_RUN) break;
      if (!resp?.IsTruncated) break;
      ContinuationToken = resp?.NextContinuationToken;
      if (!ContinuationToken) break;
    }

    const limited = candidates.length >= MAX_DELETE_PER_RUN;

    // Audit (always, even dry-run)
    await audit({
      actorId: guard.me.id,
      action: dryRun ? "DRAFT_STORAGE_CLEANUP_DRY_RUN" : "DRAFT_STORAGE_CLEANUP_DELETE",
      entityType: "R2",
      entityId: "drafts/",
      reason: null,
      meta: {
        cutoffMinutes: minutes,
        dryRun,
        scanned,
        candidatesFound: candidates.length,
        limited,
      },
    });

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        mode: "dryRun",
        cutoffMinutes: minutes,
        scanned,
        candidatesFound: candidates.length,
        limited,
        note: limited ? `Hit safety cap of ${MAX_DELETE_PER_RUN}. Run again to continue.` : null,
      });
    }

    const deletions = candidates.length ? await deleteR2Keys(candidates) : { attempted: 0, deleted: 0 };
    if (candidates.length) {
      await prisma.draftUpload.deleteMany({
        where: {
          claimedAt: null,
          key: { in: candidates },
        },
      });
    }

    await audit({
      actorId: guard.me.id,
      action: "DRAFT_STORAGE_CLEANUP_DELETE_RESULT",
      entityType: "R2",
      entityId: "drafts/",
      reason: null,
      meta: {
        cutoffMinutes: minutes,
        scanned,
        candidatesFound: candidates.length,
        limited,
        deletions,
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "delete",
      cutoffMinutes: minutes,
      scanned,
      candidatesFound: candidates.length,
      limited,
      deletions,
      note: limited ? `Hit safety cap of ${MAX_DELETE_PER_RUN}. Run again to continue.` : null,
    });
  } catch (err) {
    console.error("POST /api/admin/cleanup-drafts error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Cleanup failed.", detail: err?.details || undefined },
      { status: 500 }
    );
  }
}
