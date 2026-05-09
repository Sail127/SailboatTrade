// app/api/auth/reset-password/route.js
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { peekResetTokenEmail, verifyResetToken } from "@/lib/passwordResetToken";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";

export async function POST(req) {
  if (!isTrustedOrigin(req)) {
    return Response.json({ ok: false, error: "Invalid origin." }, { status: 403 });
  }

  const rl = await rateLimit({
    key: makeRateLimitKey(req, "auth_reset_password"),
    limit: 12,
    windowMs: 30 * 60 * 1000,
  });
  if (!rl.ok) {
    return Response.json(
      { ok: false, error: "Too many password reset attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const token = (body?.token ?? "").toString().trim();
  const password = (body?.password ?? "").toString();

  if (!token) {
    return Response.json({ ok: false, error: "Missing reset token." }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return Response.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const tokenEmail = peekResetTokenEmail(token);
  if (!tokenEmail) {
    return Response.json({ ok: false, error: "Reset link is invalid or expired." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: tokenEmail },
    select: { id: true, passwordHash: true },
  });
  if (!user) {
    return Response.json({ ok: false, error: "Reset link is invalid or expired." }, { status: 400 });
  }

  const payload = verifyResetToken(token, { passwordHash: user.passwordHash });
  if (!payload?.email) {
    return Response.json({ ok: false, error: "Reset link is invalid or expired." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return Response.json({ ok: true });
}
