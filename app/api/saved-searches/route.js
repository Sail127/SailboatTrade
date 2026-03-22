import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function normalizePath(path) {
  const value = String(path || "").trim();
  if (!value.startsWith("/listings")) return "";
  return value;
}

function normalizeName(name) {
  return String(name || "").trim().slice(0, 60);
}

export async function GET() {
  const session = await requireUser().catch(() => null);
  if (!session?.uid) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const savedSearches = await prisma.savedSearch.findMany({
    where: { userId: String(session.uid) },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true, path: true },
  });

  return NextResponse.json({ ok: true, savedSearches });
}

export async function POST(req) {
  const session = await requireUser().catch(() => null);
  if (!session?.uid) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = normalizeName(body?.name);
  const path = normalizePath(body?.path);

  if (!name) {
    return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
  }

  if (!path) {
    return NextResponse.json({ ok: false, error: "A valid listings search is required" }, { status: 400 });
  }

  const userId = String(session.uid);
  const existing = await prisma.savedSearch.findFirst({
    where: { userId, path },
    select: { id: true },
  });

  const savedSearch = existing
    ? await prisma.savedSearch.update({
        where: { id: existing.id },
        data: { name, path },
        select: { id: true, name: true, path: true },
      })
    : await prisma.savedSearch.create({
        data: { userId, name, path },
        select: { id: true, name: true, path: true },
      });

  return NextResponse.json({ ok: true, savedSearch });
}
