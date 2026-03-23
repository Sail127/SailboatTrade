import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { getEmailHealthSnapshot } from "@/lib/emailHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status || 403 });
  }

  try {
    const snapshot = await getEmailHealthSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Could not load email health." },
      { status: 500 },
    );
  }
}
