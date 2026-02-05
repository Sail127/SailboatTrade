import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function PUT(req, { params }) {
  const s = await requireUser();
  const body = await req.json().catch(() => ({}));

  const listing = await prisma.listing.findFirst({ where: { id: params.id, ownerId: s.uid } });
  if (!listing) return Response.json({ ok: false, error: "Not found." }, { status: 404 });

  // Don’t allow edits after publish unless you want (you can relax later)
  if (listing.status === "PUBLISHED") {
    return Response.json({ ok: false, error: "Published listings are read-only for now." }, { status: 400 });
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      title: body.title ?? listing.title,
      description: body.description ?? listing.description,
      year: body.year ?? listing.year,
      builder: body.builder ?? listing.builder,
      model: body.model ?? listing.model,
      loa: body.loa ?? listing.loa,
      heroImageUrl: body.heroImageUrl ?? listing.heroImageUrl,
    },
  });

  return Response.json({ ok: true, listing: updated });
}
