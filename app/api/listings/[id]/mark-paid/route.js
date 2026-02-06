import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req, { params }) {
  const s = await requireUser();

  const listing = await prisma.listing.findFirst({
    where: { id: params.id, ownerId: s.uid },
  });

  if (!listing) return Response.json({ ok: false, error: "Not found." }, { status: 404 });

  // Only allow “paid” transition from checkout states
  if (!["READY_FOR_CHECKOUT", "DRAFT"].includes(listing.status)) {
    return Response.json({ ok: false, error: "Invalid state for payment." }, { status: 400 });
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      status: "PENDING_REVIEW",
      submittedForReviewAt: new Date(),
    },
  });

  return Response.json({ ok: true, previewToken: updated.previewToken });
}
