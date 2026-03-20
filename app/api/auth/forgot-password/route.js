// app/api/auth/forgot-password/route.js
import prisma from "@/lib/prisma";
import { sendEmail, getAppUrl } from "@/lib/email";
import { buildPasswordResetMessage } from "@/lib/email/templates";
import { createResetToken } from "@/lib/passwordResetToken";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";

export async function POST(req) {
  if (!isTrustedOrigin(req)) {
    return Response.json({ ok: false, error: "Invalid origin." }, { status: 403 });
  }

  const rl = rateLimit({
    key: makeRateLimitKey(req, "auth_forgot_password"),
    limit: 8,
    windowMs: 30 * 60 * 1000,
  });
  if (!rl.ok) {
    return Response.json(
      { ok: true },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = (body?.email ?? "").toString().trim().toLowerCase();

  // Always return OK to avoid account enumeration
  if (!email || !email.includes("@")) {
    return Response.json({ ok: true });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = createResetToken({ email, ttlMinutes: 30 });
    const resetUrl = `${getAppUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;
    const { subject, html, text } = buildPasswordResetMessage({
      appUrl: getAppUrl(req),
      resetUrl,
      displayName: user.firstName || user.name || "",
      expiresInMinutes: 30,
    });

    try {
      await sendEmail({ to: email, subject, html, text });
    } catch (e) {
      // Don't fail the endpoint if email fails
      console.error("Forgot-password email failed:", e);
    }
  }

  return Response.json({ ok: true });
}
