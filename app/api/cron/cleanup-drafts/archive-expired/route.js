// app/api/cron/archive-expired/route.js (legacy path)
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  // Allow real Vercel cron OR secret for manual test
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || "";
  const expected = String(process.env.CRON_SECRET || "").trim();

  if (!isVercelCron && (!expected || secret !== expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const now = new Date();

    const archived = await prisma.listing.updateMany({
      where: {
        status: "PUBLISHED",
        expiresAt: { not: null, lt: now },
      },
      data: { status: "ARCHIVED", featuredHome: false, archivedAt: now },
    });

    return NextResponse.json({ ok: true, now: now.toISOString(), archived: archived.count });
  } catch (e) {
    console.error("cron/archive-expired failed:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Cron failed." }, { status: 500 });
  }
}
