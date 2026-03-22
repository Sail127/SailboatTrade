import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function DELETE(_req, { params }) {
  const session = await requireUser().catch(() => null);
  if (!session?.uid) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Saved search id is required" }, { status: 400 });
  }

  const existing = await prisma.savedSearch.findFirst({
    where: { id, userId: String(session.uid) },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Saved search not found" }, { status: 404 });
  }

  await prisma.savedSearch.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
