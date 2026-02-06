// app/api/listings/[id]/archive/route.js
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
  if (status === "REMOVED") {
    return Response.json({ ok: false, error: "This listing was removed by an admin." }, { status: 403 });
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      status: "ARCHIVED",
      // optional: if it was pending review, take it out of the queue feel-good
      // (no schema change needed; leaving timestamps intact is also fine)
    },
  });

  return Response.json({ ok: true, listing: updated });
}
