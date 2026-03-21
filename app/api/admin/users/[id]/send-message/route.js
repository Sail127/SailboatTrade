import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, requireAdminApi } from "@/lib/admin";
import { getAppUrl, sendEmailWithRetry } from "@/lib/email";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(value, max = 4000) {
  return String(value || "").trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function buildAdminUserMessageEmail({
  appUrl,
  recipientName,
  adminName,
  subject,
  message,
}) {
  const who = escapeHtml(recipientName || "there");
  const fromName = escapeHtml(adminName || "SailboatTrade Support");
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");
  const safeAppUrl = escapeHtml(appUrl);

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f7f9;font-family:Arial,Helvetica,sans-serif;color:#13202b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dbe5ea;">
            <tr>
              <td style="background:#0a2230;padding:22px 24px;color:#ffffff;">
                <div style="font-size:24px;font-weight:800;">SailboatTrade.com</div>
                <div style="font-size:12px;color:#f3f8fc;font-weight:700;">Message from the SailboatTrade team</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8a6a12;">Admin Message</div>
                <h1 style="margin:12px 0 10px;font-size:28px;line-height:1.2;color:#0a2230;">Hello ${who},</h1>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#13202b;">A member of the SailboatTrade staff sent you the message below.</p>
                <div style="margin:0 0 18px;padding:18px;border:1px solid #d8e1e7;border-radius:18px;background:#f7fafc;">
                  <div style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#465967;text-transform:uppercase;">Subject</div>
                  <div style="margin:0 0 14px;font-size:18px;font-weight:700;color:#0a2230;">${safeSubject}</div>
                  <div style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#465967;text-transform:uppercase;">Message</div>
                  <div style="font-size:15px;line-height:1.7;color:#13202b;">${safeMessage}</div>
                </div>
                <div style="font-size:14px;line-height:1.65;color:#465967;">
                  Sent by: <strong style="color:#13202b;">${fromName}</strong><br />
                  Website: <a href="${safeAppUrl}" style="color:#0a2230;">${safeAppUrl}</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Hello ${recipientName || "there"},`,
    "",
    "A member of the SailboatTrade staff sent you the message below.",
    "",
    `Subject: ${subject}`,
    "",
    message,
    "",
    `Sent by: ${adminName || "SailboatTrade Support"}`,
    `Website: ${appUrl}`,
  ].join("\n");

  return { subject, html, text };
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
