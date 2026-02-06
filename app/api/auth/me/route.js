// app/api/auth/me/route.js
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readSession();
  if (!s?.uid) return Response.json({ ok: true, user: null });

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      role: true,
      isDisabled: true,
      deletedAt: true,

      // ✅ Phase 1
      emailVerifiedAt: true,
    },
  });

  if (!user || user.deletedAt || user.isDisabled) {
    return Response.json({ ok: true, user: null });
  }

  return Response.json({
    ok: true,
    user: {
      uid: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,

      // ✅ Phase 1
      emailVerified: Boolean(user.emailVerifiedAt),
      emailVerifiedAt: user.emailVerifiedAt,
    },
  });
}
