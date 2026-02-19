import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req, { params }) {
  let s;
  try {
    try {
      try {
        try {
          s = await requireUser();
        } catch {
          return NextResponse.json(
            { ok: false, error: "Authentication required" },
            { status: 401 },
          );
        }
      } catch {
        return NextResponse.json(
          { ok: false, error: "Authentication required" },
          { status: 401 },
        );
      }
    } catch {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 },
      );
    }
  } catch {
    return Response.json(
      { ok: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  const listing = await prisma.listing.findFirst({
    where: { id: params.id, ownerId: s.uid },
  });
  if (!listing)
    return Response.json({ ok: false, error: "Not found." }, { status: 404 });

  if (listing.paymentStatus !== "PAID") {
    return Response.json(
      { ok: false, error: "Payment required before publishing." },
      { status: 402 },
    );
  }

  const published = await prisma.listing.update({
    where: { id: listing.id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  return Response.json({ ok: true, publicUrl: `/listings/${published.id}` });
}
