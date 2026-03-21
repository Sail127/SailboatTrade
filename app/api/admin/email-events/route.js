import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import prisma from "@/lib/prisma";

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

  const url = new URL(req.url);
  const email = normalizeEmail(url.searchParams.get("email"));
  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing email." }, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);

  const [user, localEvents] = await Promise.all([
    prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        createdAt: true,
        emailVerifiedAt: true,
        emailVerificationSentAt: true,
      },
    }),
    prisma.emailDeliveryEvent.findMany({
      where: { recipient: email },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        provider: true,
        providerMessageId: true,
        eventType: true,
        sender: true,
        recipient: true,
        subject: true,
        occurredAt: true,
        createdAt: true,
      },
    }),
  ]);

  const normalizedLocalEvents = localEvents.map((item) => ({
    id: item.providerMessageId || item.id || "",
    to: item.recipient ? [item.recipient] : [],
    from: item.sender || "",
    subject: item.subject || "",
    createdAt: item.occurredAt || item.createdAt || null,
    lastEvent: item.eventType || "unknown",
    replyTo: [],
    source: "webhook",
  }));

  let normalizedProviderEvents = [];
  let warning = "";

  if (process.env.RESEND_API_KEY) {
    const response = await fetch(`https://api.resend.com/emails?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    if (response.ok) {
      normalizedProviderEvents = Array.isArray(payload?.data)
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
              source: "resend",
            }))
        : [];
    } else {
      warning = payload?.message || payload?.error || "Could not load live Resend events. Showing webhook history only.";
    }
  } else {
    warning = "Live Resend lookups are unavailable in this server process. Showing stored webhook events only.";
  }

  const seen = new Set();
  const events = [...normalizedProviderEvents, ...normalizedLocalEvents].filter((item) => {
    const key = `${item.id}::${item.lastEvent}::${item.createdAt || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({
    ok: true,
    email,
    warning,
    user: user
      ? {
          id: user.id,
          createdAt: user.createdAt,
          emailVerifiedAt: user.emailVerifiedAt,
          emailVerificationSentAt: user.emailVerificationSentAt,
        }
      : null,
    events,
  });
}
