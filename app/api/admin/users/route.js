import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sortUsers(users) {
  return [...users].sort((a, b) => {
    const aCreated = new Date(a.createdAt || 0).getTime();
    const bCreated = new Date(b.createdAt || 0).getTime();
    return bCreated - aCreated;
  });
}

export async function GET() {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status || 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      name: true,
      businessName: true,
      role: true,
      emailVerifiedAt: true,
      emailVerificationSentAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          listings: true,
          favorites: true,
          auditLogs: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    users: sortUsers(users).map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      businessName: user.businessName,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
      emailVerifiedAt: user.emailVerifiedAt,
      emailVerificationSentAt: user.emailVerificationSentAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      listingsCount: user._count?.listings || 0,
      favoritesCount: user._count?.favorites || 0,
      auditLogsCount: user._count?.auditLogs || 0,
    })),
  });
}
