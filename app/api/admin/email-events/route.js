import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export async function GET(req) {
  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status || 403 });
  }

  const email = normalizeEmail(new URL(req.url).searchParams.get("email"));
  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing email." }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, error: "Missing RESEND_API_KEY." }, { status: 500 });
  }

  const limit = Math.min(Math.max(Number(new URL(req.url).searchParams.get("limit") || 50), 1), 100);

  const response = await fetch(`https://api.resend.com/emails?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return NextResponse.json(
      { ok: false, error: payload?.message || payload?.error || "Could not load email events." },
      { status: response.status || 502 },
    );
  }

  const events = Array.isArray(payload?.data)
    ? payload.data
        .filter((item) =>
          Array.isArray(item?.to)
            ? item.to.some((recipient) => normalizeEmail(recipient) === email)
            : false
        )
        .map((item) => ({
          id: item.id || "",
          to: Array.isArray(item.to) ? item.to : [],
          from: item.from || "",
          subject: item.subject || "",
          createdAt: item.created_at || null,
          lastEvent: item.last_event || "unknown",
          replyTo: Array.isArray(item.reply_to) ? item.reply_to : [],
        }))
    : [];

  return NextResponse.json({
    ok: true,
    email,
    events,
  });
}
