import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || req.headers.get("x-cron-secret") || "";
  const expected = String(process.env.CRON_SECRET || "").trim();
  return isVercelCron || (expected && secret === expected);
}

export async function GET(req) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const retentionDays = Math.max(30, Number(process.env.EMAIL_EVENT_RETENTION_DAYS || "180"));
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await prisma.emailDeliveryEvent.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });

    return NextResponse.json({
      ok: true,
      retentionDays,
      cutoff: cutoff.toISOString(),
      deletedEvents: result?.count || 0,
    });
  } catch (err) {
    console.error("GET /api/cron/cleanup-email-events error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Email event cleanup failed." },
      { status: 500 }
    );
  }
}
