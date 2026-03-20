// app/api/auth/resend-verification/route.js
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { sendEmail, getAppUrl } from "@/lib/email";
import { buildVerifyEmailMessage } from "@/lib/email/templates";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

const COOLDOWN_SECONDS = Number(
  process.env.EMAIL_VERIFY_RESEND_COOLDOWN_SECONDS || 60,
);

export async function POST(req) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid origin." }, { status: 403 });
  }

  const rl = rateLimit({
    key: makeRateLimitKey(req, "auth_resend_verification"),
    limit: 10,
    windowMs: 30 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many resend attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const s = await requireUser().catch(() => null);
  if (!s?.uid) {
    return NextResponse.json(
      { ok: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      emailVerifiedAt: true,
      emailVerificationToken: true,
      emailVerificationExpires: true,
      emailVerificationSentAt: true,
      deletedAt: true,
      isDisabled: true,
    },
  });

  if (!user || user.deletedAt || user.isDisabled) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", error: "Unauthorized." },
      { status: 401 },
    );
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({
      ok: true,
      alreadyVerified: true,
      code: "EMAIL_ALREADY_VERIFIED",
    });
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
        { status: 429 },
      );
    }
  }

  const verifyToken = newToken();
  const verifyExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);

  // Send and only start cooldown if the provider call succeeds.
  try {
    const appUrl = getAppUrl(req);
    const displayName =
      (user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.name) || "";
    const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`;
    const { subject, html, text } = buildVerifyEmailMessage({
      appUrl,
      verifyUrl,
      displayName,
      reason: "resend",
    });

    await sendEmail({
      to: user.email,
      subject,
      html,
      text,
      tags: [{ name: "type", value: "verify_email_resend" }],
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verifyToken,
        emailVerificationExpires: verifyExpires,
        emailVerificationSentAt: new Date(),
      },
    });
  } catch (e) {
    console.error("Resend verification email failed:", e?.message || e);

    await prisma.user
      .update({
        where: { id: user.id },
        data: {
          emailVerificationToken: user.emailVerificationToken,
          emailVerificationExpires: user.emailVerificationExpires,
          emailVerificationSentAt: user.emailVerificationSentAt,
        },
      })
      .catch(() => {});

    return NextResponse.json(
      {
        ok: false,
        code: "EMAIL_SEND_FAILED",
        error: "We could not send the verification email right now. Please try again in a moment.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, retryAfterSeconds: COOLDOWN_SECONDS });
}
