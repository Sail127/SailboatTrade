// app/api/auth/reset-password/route.js
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { verifyResetToken } from "@/lib/passwordResetToken";

export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const token = (body?.token ?? "").toString().trim();
  const password = (body?.password ?? "").toString();

  if (!token) {
    return Response.json({ ok: false, error: "Missing reset token." }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return Response.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const payload = verifyResetToken(token);
  if (!payload?.email) {
    return Response.json({ ok: false, error: "Reset link is invalid or expired." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) {
    return Response.json({ ok: false, error: "Reset link is invalid or expired." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return Response.json({ ok: true });
}
