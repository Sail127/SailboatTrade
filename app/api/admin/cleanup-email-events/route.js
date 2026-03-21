import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status || 403 });
  }

  try {
    const retentionDays = Math.max(30, Number(process.env.EMAIL_EVENT_RETENTION_DAYS || "180"));
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await prisma.emailDeliveryEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return NextResponse.json({
      ok: true,
      retentionDays,
      cutoff: cutoff.toISOString(),
      deletedEvents: result?.count || 0,
    });
  } catch (err) {
    console.error("POST /api/admin/cleanup-email-events error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Email event cleanup failed." },
      { status: 500 }
    );
  }
}
