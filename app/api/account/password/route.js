// app/api/account/password/route.js
import prisma from "@/lib/prisma";
import { readSession, verifyPassword, hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

function toStr(v, maxLen = 200) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export async function PUT(req) {
  const s = await readSession();
  if (!s?.uid) return Response.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPassword = toStr(body?.currentPassword, 200);
  const newPassword = toStr(body?.newPassword, 200);

  if (!currentPassword || !newPassword) {
    return Response.json({ ok: false, error: "Missing passwords." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return Response.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: { id: true, passwordHash: true, deletedAt: true, isDisabled: true },
  });
  if (!user || user.deletedAt || user.isDisabled) {
    return Response.json({ ok: false, error: "Account not available." }, { status: 403 });
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    return Response.json({ ok: false, error: "Current password is incorrect." }, { status: 401 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return Response.json({ ok: true });
}
