// app/api/images/route.js
import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2, getR2Bucket } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") || "";
    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

    const r2 = getR2();
    const Bucket = getR2Bucket();

    const url = await getSignedUrl(r2, new GetObjectCommand({ Bucket, Key: key }), {
      expiresIn: 60 * 10,
    });

    // Redirect to signed url (browser loads image directly)
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("GET /api/images error:", err);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}
