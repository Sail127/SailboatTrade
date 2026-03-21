import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, requireAdminApi } from "@/lib/admin";
import { buildVerifyEmailMessage } from "@/lib/email/templates";
import { getAppUrl, sendEmailWithRetry } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req, { params }) {
  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status || 403 });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing user id." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      emailVerifiedAt: true,
      deletedAt: true,
      isDisabled: true,
    },
  });

  if (!user || user.deletedAt || user.isDisabled) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json(
      { ok: false, error: "This user has already verified their email." },
      { status: 400 },
    );
  }

  const verifyToken = newToken();
  const verifyExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
  const appUrl = getAppUrl(req);
  const displayName =
    (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name) || "";
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`;
  const { subject, html, text } = buildVerifyEmailMessage({
    appUrl,
    verifyUrl,
    displayName,
    reason: "signup",
  });

  const emailResult = await sendEmailWithRetry({
    to: user.email,
    subject,
    html,
    text,
    tags: [
      { name: "type", value: "verify_email" },
      { name: "source", value: "admin_resend_welcome" },
    ],
  });

  const sentAt = new Date();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verifyToken,
      emailVerificationExpires: verifyExpires,
      emailVerificationSentAt: sentAt,
    },
  });

  await audit({
    actorId: guard.me.id,
    action: "ADMIN_USER_RESEND_WELCOME_EMAIL",
    entityType: "User",
    entityId: user.id,
    meta: {
      email: user.email,
      emailId: emailResult?.id ?? null,
    },
  });

  return NextResponse.json({
    ok: true,
    userId: user.id,
    email: user.email,
    emailId: emailResult?.id ?? null,
    sentAt: sentAt.toISOString(),
  });
}
