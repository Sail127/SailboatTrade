// app/api/auth/login/route.js
import prisma from "@/lib/prisma";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.toLowerCase()?.trim();
  const password = body?.password;

  if (!email || !password) {
    return Response.json({ ok: false, error: "Missing credentials." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return Response.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  }

  // ✅ production guardrails
  if (user.deletedAt) {
    return Response.json({ ok: false, error: "Account not available." }, { status: 403 });
  }
  if (user.isDisabled) {
    return Response.json({ ok: false, error: "Account disabled." }, { status: 403 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return Response.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  }

  const token = await signSession({
    uid: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
  });

  await setSessionCookie(token);

  return Response.json({
    ok: true,
    redirectTo: "/dashboard",
  });
}
