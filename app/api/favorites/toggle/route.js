import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req) {
  const s = await requireUser();
  const { listingId } = await req.json();

  if (!listingId) return Response.json({ ok: false, error: "listingId required" }, { status: 400 });

  const existing = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId: s.uid, listingId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return Response.json({ ok: true, favorited: false });
  }

  await prisma.favorite.create({ data: { userId: s.uid, listingId } });
  return Response.json({ ok: true, favorited: true });
}
