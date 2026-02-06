// app/listings/preview/[token]/page.js
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ListingDetail from "@/components/ListingDetail";

export const dynamic = "force-dynamic";

const ALLOWED = ["DRAFT", "READY_FOR_CHECKOUT", "PENDING_REVIEW", "REJECTED"];

export default async function PreviewListing({ params }) {
  const token = params.token;

  const listing = await prisma.listing.findFirst({
    where: { previewToken: token, status: { in: ALLOWED } },
    include: { owner: { select: { email: true, id: true } } },
  });

  if (!listing) return notFound();

  // Let ListingMedia fetch images via /api/uploads?key=...&token=...
  return <ListingDetail listing={{ ...listing, __previewToken: token }} />;
}
