// app/api/users/me/route.js
import prisma from "@/lib/prisma";
import { requireUser, signSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toStr(v, maxLen = 80) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

async function getUserOr401() {
  try {
    return await requireUser(); // { uid, email, name }
  } catch {
    return null;
  }
}

export async function GET() {
  const s = await getUserOr401();
  if (!s?.uid) {
    return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return Response.json({ ok: true, user });
}

export async function PUT(req) {
  const s = await getUserOr401();
  if (!s?.uid) {
    return Response.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const firstName = toStr(body.firstName, 60);
  const lastName = toStr(body.lastName, 60);

  const name =
    (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName) || null;

  const updated = await prisma.user.update({
    where: { id: s.uid },
    data: { name },
    select: { id: true, email: true, name: true },
  });

  // Refresh session cookie so header shows updated initials immediately
  try {
    const token = await signSession({
      uid: updated.id,
      email: updated.email,
      name: updated.name,
    });
    setSessionCookie(token);
  } catch {
    // ignore
  }

  return Response.json({ ok: true, user: updated });
}
