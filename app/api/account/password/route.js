// app/api/account/password/route.js
import prisma from "@/lib/prisma";
import { readSession, hashPassword, clearSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUT /api/account/password
 * Body: { currentPassword, newPassword }
 *
 * Behavior:
 * - Validates current password
 * - Updates passwordHash
 * - Clears session cookie (forces logout)
 */
export async function PUT(req) {
  const s = await readSession();
  if (!s?.uid) {
    return Response.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body?.currentPassword || "");
  const newPassword = String(body?.newPassword || "");

  if (!currentPassword || !newPassword) {
    return Response.json(
      { ok: false, error: "Enter current password and a new password." },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return Response.json(
      { ok: false, error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: {
      id: true,
      passwordHash: true,
      deletedAt: true,
      isDisabled: true,
    },
  });

  if (!user || user.deletedAt || user.isDisabled) {
    return Response.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return Response.json(
      { ok: false, error: "Current password is incorrect." },
      { status: 400 }
    );
  }

  const same = await bcrypt.compare(newPassword, user.passwordHash);
  if (same) {
    return Response.json(
      { ok: false, error: "New password must be different from your current password." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
    select: { id: true },
  });

  // ✅ Force logout after successful password change
  try {
    clearSessionCookie();
  } catch {}

  return Response.json({
    ok: true,
    forceLogout: true,
    message: "Password updated. Please log in again.",
  });
}
