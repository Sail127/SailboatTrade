// app/api/auth/resend-verification/route.js
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { sendEmail, getAppUrl } from "@/lib/email";
import crypto from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

const COOLDOWN_SECONDS = Number(process.env.EMAIL_VERIFY_RESEND_COOLDOWN_SECONDS || 60);

export async function POST(req) {
  const s = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      emailVerifiedAt: true,
      emailVerificationSentAt: true,
      deletedAt: true,
      isDisabled: true,
    },
  });

  if (!user || user.deletedAt || user.isDisabled) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", error: "Unauthorized." },
      { status: 401 }
    );
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true, code: "EMAIL_ALREADY_VERIFIED" });
  }

  // ✅ Cooldown
  if (user.emailVerificationSentAt) {
    const last = new Date(user.emailVerificationSentAt).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - last) / 1000);
    const remaining = COOLDOWN_SECONDS - elapsed;

    if (remaining > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "COOLDOWN",
          error: "Please wait before resending.",
          retryAfterSeconds: remaining,
        },
        { status: 429 }
      );
    }
  }

  const verifyToken = newToken();
  const verifyExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verifyToken,
      emailVerificationExpires: verifyExpires,
      emailVerificationSentAt: new Date(),
    },
  });

  // Send (don’t fail the API if the email provider is flaky)
  try {
    const appUrl = getAppUrl(req);
    const displayName =
      (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name) || "";
    const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`;

    await sendEmail({
      to: user.email,
      subject: "Verify your email — SailboatTrade",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2 style="margin:0 0 10px;">Verify your email${displayName ? `, ${displayName}` : ""}</h2>
          <p>Click the button below to verify your email.</p>
          <p>
            <a href="${verifyUrl}" style="display:inline-block;background:#c8a44d;color:#0a2230;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700;">
              Verify email
            </a>
          </p>
          <p style="color:#64748b;font-size:13px;margin-top:18px;">
            If you didn’t create an account, you can ignore this email.
          </p>
        </div>
      `,
      text: `Verify your email: ${verifyUrl}`,
      tags: [{ name: "type", value: "verify_email_resend" }],
    });
  } catch (e) {
    console.error("Resend verification email failed:", e?.message || e);
  }

  return NextResponse.json({ ok: true, retryAfterSeconds: COOLDOWN_SECONDS });
}
