// app/api/listings/[id]/restore/route.js
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const s = await requireUser();

  const listing = await prisma.listing.findFirst({
    where: { id: params.id, ownerId: s.uid },
    select: { id: true, status: true },
  });

  if (!listing) {
    return Response.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const status = String(listing.status || "").toUpperCase();
  if (status !== "ARCHIVED") {
    return Response.json({ ok: false, error: "Only archived listings can be restored." }, { status: 400 });
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      status: "DRAFT",
    },
  });

  return Response.json({ ok: true, listing: updated });
}
