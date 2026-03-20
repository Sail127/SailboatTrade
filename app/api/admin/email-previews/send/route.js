import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, requireAdminApi } from "@/lib/admin";
import { getAppUrl, sendEmail } from "@/lib/email";
import { getEmailPreviewByKey } from "@/lib/email/templates";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export async function POST(req) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid origin." }, { status: 403 });
  }

  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status || 403 });
  }

  const rl = rateLimit({
    key: makeRateLimitKey(req, "admin_email_previews_send"),
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many preview emails sent. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => null);
  const key = String(body?.key || "").trim();
  const to = String(body?.to || "").trim().toLowerCase();

  if (!key) {
    return NextResponse.json({ ok: false, error: "Missing email template key." }, { status: 400 });
  }

  if (!isValidEmail(to)) {
    return NextResponse.json({ ok: false, error: "Please provide a valid email address." }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { id: guard.me.id },
    select: { id: true, email: true, firstName: true, lastName: true, name: true },
  });

  const currentAdminName =
    [me?.firstName, me?.lastName].filter(Boolean).join(" ").trim() || me?.name || guard.me.email;

  const preview = getEmailPreviewByKey({
    key,
    appUrl: getAppUrl(req),
    currentAdminEmail: guard.me.email,
    currentAdminName,
  });

  if (!preview) {
    return NextResponse.json({ ok: false, error: "Unknown email template." }, { status: 404 });
  }

  await sendEmail({
    to,
    subject: `[Preview] ${preview.subject}`,
    html: preview.html,
    text: preview.text,
    tags: [
      { name: "type", value: "admin_email_preview" },
      { name: "template", value: preview.key },
    ],
  });

  await audit({
    actorId: guard.me.id,
    action: "ADMIN_EMAIL_PREVIEW_SENT",
    entityType: "EmailTemplate",
    entityId: preview.key,
    meta: { to },
  });

  return NextResponse.json({ ok: true, key: preview.key, sentTo: to });
}
