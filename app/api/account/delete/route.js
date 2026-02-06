// app/api/account/delete/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const s = await requireUser();

    const user = await prisma.user.findUnique({
      where: { id: s.uid },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    // Gather listing IDs so we can delete favorites that reference them (FK-safe)
    const listingIds = await prisma.listing.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });
    const ids = listingIds.map((x) => x.id);

    await prisma.$transaction([
      // Favorites owned by this user
      prisma.favorite.deleteMany({ where: { userId: user.id } }),

      // Favorites on this user's listings (avoid FK constraint issues)
      ...(ids.length
        ? [prisma.favorite.deleteMany({ where: { listingId: { in: ids } } })]
        : []),

      // Listings owned by this user
      prisma.listing.deleteMany({ where: { ownerId: user.id } }),

      // Audit logs (in case they ever acted as admin/mod)
      prisma.adminAuditLog.deleteMany({ where: { actorId: user.id } }),

      // Finally delete the user
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    // Clear auth cookie so they're logged out immediately
    const res = NextResponse.json({ ok: true });
    res.cookies.set("sbt_session", "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    console.error("POST /api/account/delete error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to delete account." },
      { status: 500 }
    );
  }
}
