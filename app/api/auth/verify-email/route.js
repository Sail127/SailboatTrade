// app/api/auth/verify-email/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      deletedAt: null,
      isDisabled: false,
    },
    select: {
      id: true,
      emailVerificationExpires: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Invalid verification link." }, { status: 400 });
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
    return NextResponse.json({ ok: false, error: "Verification link expired." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpires: null,
      emailVerificationSentAt: null, // ✅ optional cleanup
    },
  });

  return NextResponse.json({ ok: true });
}
