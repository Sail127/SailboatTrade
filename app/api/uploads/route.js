// app/api/uploads/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, getR2Bucket, makeObjectKey } from "@/lib/r2";
import { normalizeDraftUploadKeys } from "@/lib/draftUploads";
import { requireUser } from "@/lib/auth";
import { hasMinRole } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MB = 12;
const MAX_BYTES = MAX_MB * 1024 * 1024;

// Resize targets
const MAX_DIM = 2000;
const WEBP_QUALITY = 82;

function isSafeKey(key) {
  const s = String(key || "").trim();
  if (!s) return false;
  if (s.includes("..") || s.startsWith("/") || s.startsWith("\\")) return false;
  return true;
}

function isDraftKey(key) {
  return String(key || "").startsWith("drafts/");
}

async function canUserAccessDraftKey(userId, key) {
  const uid = String(userId || "").trim();
  const normalizedKey = String(key || "").trim();
  if (!uid || !normalizedKey || !isDraftKey(normalizedKey)) return false;

  const userPrefix = `drafts/${uid}/`;
  if (normalizedKey.startsWith(userPrefix)) return true;

  const [user, listing] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uid },
      select: { brokerHeroImageUrl: true },
    }),
    prisma.listing.findFirst({
      where: {
        ownerId: uid,
        OR: [
          { heroImageUrl: normalizedKey },
          { brokerHeroImageUrl: normalizedKey },
          { imageUrls: { has: normalizedKey } },
        ],
      },
      select: { id: true },
    }),
  ]);

  if (user?.brokerHeroImageUrl === normalizedKey) return true;
  if (listing?.id) return true;

  return false;
}

async function getActiveSessionUser() {
  const s = await requireUser().catch(() => null);
  if (!s?.uid) return null;

  const user = await prisma.user.findUnique({
    where: { id: String(s.uid) },
    select: { id: true, role: true, deletedAt: true, isDisabled: true, brokerHeroImageUrl: true },
  });

  if (!user || user.deletedAt || user.isDisabled) return null;
  return user;
}

async function findUserReferencedDraftKeys(userId, keys) {
  const requested = normalizeDraftUploadKeys(keys);
  if (!requested.length) return new Set();

  const [user, listings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: String(userId) },
      select: { brokerHeroImageUrl: true },
    }),
    prisma.listing.findMany({
      where: {
        ownerId: String(userId),
        OR: [
          { heroImageUrl: { in: requested } },
          { brokerHeroImageUrl: { in: requested } },
          { imageUrls: { hasSome: requested } },
        ],
      },
      select: { heroImageUrl: true, brokerHeroImageUrl: true, imageUrls: true },
    }),
  ]);

  const referenced = new Set();

  if (requested.includes(String(user?.brokerHeroImageUrl || ""))) {
    referenced.add(String(user.brokerHeroImageUrl));
  }

  for (const listing of listings) {
    if (listing.heroImageUrl && requested.includes(String(listing.heroImageUrl))) {
      referenced.add(String(listing.heroImageUrl));
    }
    if (listing.brokerHeroImageUrl && requested.includes(String(listing.brokerHeroImageUrl))) {
      referenced.add(String(listing.brokerHeroImageUrl));
    }
    for (const key of listing.imageUrls || []) {
      if (requested.includes(String(key))) referenced.add(String(key));
    }
  }

  return referenced;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key")?.trim();
    const token = searchParams.get("token")?.trim();

    if (!key || !isSafeKey(key)) {
      return NextResponse.json({ error: "Missing or invalid key." }, { status: 400 });
    }

    // 1) Token-based preview access (listing preview pages)
    if (token) {
      const listing = await prisma.listing.findFirst({
        where: {
          previewToken: token,
          OR: [{ heroImageUrl: key }, { brokerHeroImageUrl: key }, { imageUrls: { has: key } }],
        },
        select: { id: true },
      });

      if (!listing) {
        return NextResponse.json({ error: "Not authorized to preview this image." }, { status: 403 });
      }

      const r2 = getR2();
      const Bucket = getR2Bucket();

      const signedUrl = await getSignedUrl(r2, new GetObjectCommand({ Bucket, Key: key }), {
        expiresIn: 60 * 30,
      });

      const res = NextResponse.redirect(signedUrl, { status: 302 });
      res.headers.set("Cache-Control", "no-store, max-age=0");
      return res;
    }

    // 2) Public access (PUBLISHED only)
    const now = new Date();
    const published = await prisma.listing.findFirst({
      where: {
        status: "PUBLISHED",
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
        OR: [{ heroImageUrl: key }, { brokerHeroImageUrl: key }, { imageUrls: { has: key } }],
      },
      select: { id: true },
    });

    // 3) Draft access: only the owning user may view drafts/*
    if (!published) {
      if (!isDraftKey(key)) {
        return NextResponse.json({ error: "Image is not public." }, { status: 403 });
      }

      const s = await requireUser().catch(() => null);
      if (!s?.uid) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: String(s.uid) },
        select: { id: true, role: true, isDisabled: true, deletedAt: true },
      });

      if (!currentUser || currentUser.deletedAt || currentUser.isDisabled) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const isReviewer = hasMinRole(currentUser.role, "MODERATOR");
      const allowed = isReviewer ? true : await canUserAccessDraftKey(currentUser.id, key);
      if (!allowed) {
        return NextResponse.json({ error: "Not authorized to access this draft image." }, { status: 403 });
      }
    }

    const r2 = getR2();
    const Bucket = getR2Bucket();

    const signedUrl = await getSignedUrl(r2, new GetObjectCommand({ Bucket, Key: key }), {
      expiresIn: 60 * 30,
    });

    const res = NextResponse.redirect(signedUrl, { status: 302 });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    console.error("GET /api/uploads error:", err);
    return NextResponse.json({ error: "Failed to create preview URL." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getActiveSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file) return NextResponse.json({ error: "Missing file." }, { status: 400 });
    if (typeof file === "string") return NextResponse.json({ error: "Invalid file payload." }, { status: 400 });
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
    }

    const size = Number(file.size || 0);
    if (size > MAX_BYTES) {
      return NextResponse.json({ error: `Image too large. Max ${MAX_MB}MB per photo.` }, { status: 413 });
    }

    const r2 = getR2();
    const Bucket = getR2Bucket();

    // bucket exists check
    try {
      await r2.send(new HeadBucketCommand({ Bucket }));
    } catch (e) {
      const code = e?.name || e?.Code || "HeadBucketFailed";
      return NextResponse.json(
        {
          error: "R2 bucket check failed. Confirm R2_BUCKET_NAME exists in this Cloudflare account.",
          details: { code, bucket: Bucket },
        },
        { status: 500 }
      );
    }

    const inputBytes = Buffer.from(await file.arrayBuffer());

    let outputBytes = inputBytes;
    try {
      const sharpMod = await import("sharp");
      const sharp = sharpMod.default || sharpMod;

      outputBytes = await sharp(inputBytes, { failOnError: false })
        .rotate()
        .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (e) {
      return NextResponse.json(
        { error: "Image processing is not configured. Install sharp: `npm i sharp`.", detail: String(e?.message || e) },
        { status: 500 }
      );
    }

    // ✅ Store drafts under drafts/<uid>/... (still starts with drafts/ so existing logic works)
    const Key = makeObjectKey({ folder: `drafts/${String(user.id)}`, ext: "webp" });

    await r2.send(
      new PutObjectCommand({
        Bucket,
        Key,
        Body: outputBytes,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
        Metadata: { originalname: String(file.name || "").slice(0, 200) },
      })
    );

    try {
      await prisma.draftUpload.create({
        data: {
          key: Key,
          userId: String(user.id),
          lastTouchedAt: new Date(),
        },
      });
    } catch (dbErr) {
      try {
        await r2.send(
          new DeleteObjectsCommand({
            Bucket,
            Delete: { Objects: [{ Key }], Quiet: true },
          })
        );
      } catch {}
      throw dbErr;
    }

    // Give a longer preview URL so your 30-min draft TTL doesn’t show broken images
    const previewUrl = await getSignedUrl(r2, new GetObjectCommand({ Bucket, Key }), { expiresIn: 60 * 30 });

    const res = NextResponse.json({ key: Key, previewUrl, bytesIn: inputBytes.length, bytesOut: outputBytes.length });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    console.error("POST /api/uploads error:", err);
    return NextResponse.json(
      { error: "Upload failed.", details: { name: err?.name, code: err?.Code, message: err?.message } },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const user = await getActiveSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const keys = normalizeDraftUploadKeys(body?.keys);
    if (!keys.length) {
      return NextResponse.json({ ok: true, touched: 0 });
    }

    const result = await prisma.draftUpload.updateMany({
      where: {
        userId: String(user.id),
        claimedAt: null,
        key: { in: keys },
      },
      data: { lastTouchedAt: new Date() },
    });

    return NextResponse.json({ ok: true, touched: result.count });
  } catch (err) {
    console.error("PATCH /api/uploads error:", err);
    return NextResponse.json({ error: "Failed to refresh draft uploads." }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await getActiveSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedKeys = normalizeDraftUploadKeys(body?.keys);
    if (!requestedKeys.length) {
      return NextResponse.json({ ok: true, deleted: 0 });
    }

    const referenced = await findUserReferencedDraftKeys(user.id, requestedKeys);
    const trackedRows = await prisma.draftUpload.findMany({
      where: {
        userId: String(user.id),
        key: { in: requestedKeys },
      },
      select: { key: true, claimedAt: true },
    });

    const trackedMap = new Map(trackedRows.map((row) => [String(row.key), row]));
    const userPrefix = `drafts/${String(user.id)}/`;

    const deletableKeys = requestedKeys.filter((key) => {
      if (referenced.has(key)) return false;
      const tracked = trackedMap.get(key);
      if (tracked) return !tracked.claimedAt;
      return key.startsWith(userPrefix);
    });

    if (!deletableKeys.length) {
      return NextResponse.json({ ok: true, deleted: 0 });
    }

    const r2 = getR2();
    const Bucket = getR2Bucket();
    await r2.send(
      new DeleteObjectsCommand({
        Bucket,
        Delete: { Objects: deletableKeys.map((Key) => ({ Key })), Quiet: true },
      })
    );

    await prisma.draftUpload.deleteMany({
      where: {
        userId: String(user.id),
        claimedAt: null,
        key: { in: deletableKeys },
      },
    });

    return NextResponse.json({ ok: true, deleted: deletableKeys.length });
  } catch (err) {
    console.error("DELETE /api/uploads error:", err);
    return NextResponse.json({ error: "Failed to delete draft uploads." }, { status: 500 });
  }
}
