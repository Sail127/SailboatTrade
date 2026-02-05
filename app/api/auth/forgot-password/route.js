// app/api/auth/forgot-password/route.js
import prisma from "@/lib/prisma";
import { sendEmail, getAppUrl } from "@/lib/email";
import { createResetToken } from "@/lib/passwordResetToken";

export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = (body?.email ?? "").toString().trim().toLowerCase();

  // Always return OK to avoid account enumeration
  if (!email || !email.includes("@")) {
    return Response.json({ ok: true });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = createResetToken({ email, ttlMinutes: 30 });
    const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;

    const subject = "Reset your SailboatTrade password";
    const text = `Reset your password: ${resetUrl}\n\nThis link expires in 30 minutes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.45;">
        <h2 style="margin:0 0 10px;">Reset your password</h2>
        <p>We received a request to reset your SailboatTrade.com password.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#c8a44d;color:#0a2230;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700;">
            Reset Password
          </a>
        </p>
        <p style="color:#64748b;font-size:13px;">
          This link expires in 30 minutes. If you didn’t request this, you can ignore this email.
        </p>
      </div>
    `;

    try {
      await sendEmail({ to: email, subject, html, text });
    } catch (e) {
      // Don't fail the endpoint if email fails
      console.error("Forgot-password email failed:", e);
    }
  }

  return Response.json({ ok: true });
}
