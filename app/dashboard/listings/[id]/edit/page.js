import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import ListingEditClient from "@/app/listings/[id]/edit/ListingEditClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }) {
  const id = String(params?.id || "").trim();
  if (!id) return notFound();

  const s = await requireUser().catch(() => null);
  if (!s?.uid) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/listings/${id}/edit`)}`);
  }

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return notFound();
  if (listing.ownerId !== s.uid) redirect("/dashboard/listings");

  const status = String(listing.status || "").toUpperCase();
  if (!["DRAFT", "REJECTED", "PUBLISHED"].includes(status)) redirect("/dashboard/listings");

  const safe = JSON.parse(JSON.stringify(listing));
  return <ListingEditClient initialListing={safe} previewToken={String(listing.previewToken || "")} />;
}
