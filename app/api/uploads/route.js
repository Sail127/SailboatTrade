// app/api/uploads/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PutObjectCommand, GetObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, getR2Bucket, makeObjectKey, guessExt } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSafeKey(key) {
  const s = String(key || "").trim();
  if (!s) return false;
  if (s.includes("..") || s.startsWith("/") || s.startsWith("\\")) return false;
  return true;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key")?.trim();
    const token = searchParams.get("token")?.trim();

    if (!key || !isSafeKey(key)) {
      return NextResponse.json({ error: "Missing or invalid key." }, { status: 400 });
    }

    // LIVE fields (publicly accessible ONLY if listing is PUBLISHED)
    const whereLiveMatches = {
      OR: [{ heroImageUrl: key }, { brokerLogoUrl: key }, { imageUrls: { has: key } }],
    };

    // LIVE + PENDING fields (accessible if you have previewToken)
    // ✅ requires staged-content fields: pendingHeroImageUrl, pendingImageUrls
    const whereLiveOrPendingMatches = {
      OR: [
        { heroImageUrl: key },
        { brokerLogoUrl: key },
        { imageUrls: { has: key } },

        { pendingHeroImageUrl: key },
        { pendingImageUrls: { has: key } },
      ],
    };

    // ✅ OPTIONAL 4: allow preview for ARCHIVED listings too (token-only)
    // Note: token preview now works for ANY status (including ARCHIVED, PUBLISHED, etc.)
    const listing = token
      ? await prisma.listing.findFirst({
          where: {
            previewToken: token,
            ...whereLiveOrPendingMatches,
          },
          select: { id: true },
        })
      : await prisma.listing.findFirst({
          where: {
            status: "PUBLISHED",
            ...whereLiveMatches,
          },
          select: { id: true },
        });

    if (!listing) {
      return NextResponse.json(
        { error: token ? "Not authorized to preview this image." : "Image is not public." },
        { status: 403 }
      );
    }

    const r2 = getR2();
    const Bucket = getR2Bucket();

    const signedUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket, Key: key }),
      { expiresIn: 60 * 5 }
    );

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
    if (typeof file === "string") {
      return NextResponse.json({ error: "Invalid file payload." }, { status: 400 });
    }
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
    }

    const r2 = getR2();
    const Bucket = getR2Bucket();

    // ✅ Quick sanity check: bucket exists (clearer error)
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

    const ext = guessExt(file.name, file.type);
    const Key = makeObjectKey({ folder: "drafts", ext });
    const bytes = Buffer.from(await file.arrayBuffer());

    await r2.send(
      new PutObjectCommand({
        Bucket,
        Key,
        Body: bytes,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
        Metadata: { originalname: file.name?.slice(0, 200) || "" },
      })
    );

    const previewUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket, Key }),
      { expiresIn: 60 * 5 }
    );

    const res = NextResponse.json({ key: Key, previewUrl });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    console.error("POST /api/uploads error:", err);
    return NextResponse.json(
      {
        error: "Upload failed.",
        details: {
          name: err?.name,
          code: err?.Code,
          message: err?.message,
        },
      },
      { status: 500 }
    );
  }
}
