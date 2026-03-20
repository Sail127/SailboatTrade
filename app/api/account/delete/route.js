// app/api/account/delete/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { deleteUserCompletely } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const s = await requireUser().catch(() => null);
    if (!s?.uid) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: s.uid },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    await deleteUserCompletely(user.id);

    // Clear auth cookie so they're logged out immediately
    const res = NextResponse.json({ ok: true });
    res.cookies.set("sbt_session", "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (err) {
    console.error("POST /api/account/delete error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to delete account." },
      { status: 500 }
    );
  }
}
