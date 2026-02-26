// app/listings/preview/[token]/page.js
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PreviewListingPage({ params }) {
  const token = String(params?.token || "").trim();
  if (!token) return notFound();

  const listing = await prisma.listing.findFirst({
    where: { previewToken: token },
    select: { id: true, status: true },
  });

  if (!listing) return notFound();

  const status = String(listing.status || "").toUpperCase();
  if (status === "REMOVED" || status === "ARCHIVED") return notFound(); // no token previews for archived/removed listings

  redirect(`/listings/${listing.id}?token=${encodeURIComponent(token)}`);
}
