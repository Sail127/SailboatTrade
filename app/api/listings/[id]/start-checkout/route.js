import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req, { params }) {
  const s = await requireUser();
  const listing = await prisma.listing.findFirst({ where: { id: params.id, ownerId: s.uid } });
  if (!listing) return Response.json({ ok: false, error: "Not found." }, { status: 404 });

  // Validate publish requirements before checkout
  const missing = [];
  if (!listing.year) missing.push("Year");
  if (!listing.builder) missing.push("Builder");
  if (!listing.model) missing.push("Model");
  if (!listing.loa) missing.push("LOA");
  if (!listing.heroImageUrl) missing.push("Photo");

  if (missing.length) {
    return Response.json({ ok: false, error: `Missing required: ${missing.join(", ")}` }, { status: 400 });
  }

  // Stub “session”
  const sessionId = `stub_${listing.id}_${Date.now()}`;

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      status: "READY_FOR_CHECKOUT",
      paymentStatus: "PENDING",
      paymentProvider: "STUB",
      paymentSessionId: sessionId,
    },
  });

  // Later: replace with Stripe Checkout URL
  return Response.json({ ok: true, checkoutUrl: `/checkout/${listing.id}` });
}
