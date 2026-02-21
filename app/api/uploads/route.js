// app/api/uploads/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PutObjectCommand, GetObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, getR2Bucket, makeObjectKey } from "@/lib/r2";
import { requireUser } from "@/lib/auth";

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
    const published = await prisma.listing.findFirst({
      where: {
        status: "PUBLISHED",
        OR: [{ heroImageUrl: key }, { brokerHeroImageUrl: key }, { imageUrls: { has: key } }],
      },
      select: { id: true },
    });

    // 3) Draft access: allow logged-in users to view drafts/*
    //    (Keys are unguessable; this prevents your form previews from 403ing.)
    if (!published) {
      if (!isDraftKey(key)) {
        return NextResponse.json({ error: "Image is not public." }, { status: 403 });
      }

      const s = await requireUser().catch(() => null);
      if (!s?.uid) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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

    const Key = makeObjectKey({ folder: "drafts", ext: "webp" });

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