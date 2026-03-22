import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, requireAdminApi } from "@/lib/admin";
import { getAppUrl, sendEmailWithRetry } from "@/lib/email";
import { buildAdminUserMessageEmail } from "@/lib/email/templates";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(value, max = 4000) {
  return String(value || "").trim().slice(0, max);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export async function POST(req, { params }) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid origin." }, { status: 403 });
  }

  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status || 403 });
  }

  const rl = rateLimit({
    key: makeRateLimitKey(req, `admin_user_send_message:${guard.me.id}`),
    limit: 40,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many admin emails sent. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing user id." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const subject = normalize(body?.subject, 160);
  const message = normalize(body?.message, 4000);

  if (!subject) {
    return NextResponse.json({ ok: false, error: "Subject is required." }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ ok: false, error: "Message is required." }, { status: 400 });
  }

  const [user, admin] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        deletedAt: true,
        isDisabled: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: guard.me.id },
      select: { firstName: true, lastName: true, name: true, email: true },
    }),
  ]);

  if (!user || user.deletedAt || user.isDisabled || !isValidEmail(user.email)) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  const recipientName =
    `${normalize(user.firstName, 80)} ${normalize(user.lastName, 80)}`.trim() ||
    normalize(user.name, 160) ||
    "there";
  const adminName =
    `${normalize(admin?.firstName, 80)} ${normalize(admin?.lastName, 80)}`.trim() ||
    normalize(admin?.name, 160) ||
    normalize(admin?.email, 160) ||
    guard.me.email;

  const email = buildAdminUserMessageEmail({
    appUrl: getAppUrl(req),
    recipientName,
    adminName,
    subject,
    message,
  });

  const result = await sendEmailWithRetry({
    to: user.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    tags: [
      { name: "type", value: "admin_user_message" },
      { name: "user_id", value: user.id },
    ],
  });

  await audit({
    actorId: guard.me.id,
    action: "ADMIN_USER_SEND_MESSAGE",
    entityType: "User",
    entityId: user.id,
    meta: {
      email: user.email,
      subject,
      emailId: result?.id ?? null,
    },
  });

  return NextResponse.json({
    ok: true,
    userId: user.id,
    email: user.email,
    emailId: result?.id ?? null,
  });
}
