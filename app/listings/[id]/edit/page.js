// app/listings/[id]/edit/page.js
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import ListingEditClient from "./ListingEditClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOwnerId(listing) {
  // Covers common schema variants without Prisma-select crashing.
  return (
    listing?.userId ??
    listing?.ownerId ??
    listing?.sellerId ??
    listing?.createdById ??
    listing?.accountId ??
    null
  );
}

export default async function ListingEditPage({ params, searchParams }) {
  const user = await requireUser(); // your existing auth helper (redirects if not logged in)

  const id = String(params?.id || "").trim();
  if (!id) notFound();

  const previewToken = String(searchParams?.token || "").trim();

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) notFound();

  const ownerId = getOwnerId(listing);
  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN";
  const isOwner = ownerId && String(ownerId) === String(user?.id || user?.uid || "");

  if (!isOwner && !isAdmin) {
    const t = previewToken ? `?token=${encodeURIComponent(previewToken)}` : "";
    redirect(`/listings/${encodeURIComponent(id)}${t}`);
  }

  // Make Dates serializable
  const safeListing = JSON.parse(JSON.stringify(listing));

  return <ListingEditClient initialListing={safeListing} previewToken={previewToken} />;
}