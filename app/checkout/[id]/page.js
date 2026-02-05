import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import CheckoutUI from "./ui";

export default async function Checkout({ params }) {
  const s = await requireUser();
  const listing = await prisma.listing.findFirst({ where: { id: params.id, ownerId: s.uid } });
  if (!listing) return <div className="p-10">Not found.</div>;

  return <CheckoutUI listing={listing} />;
}
