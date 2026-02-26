// app/listings/[id]/edit/page.js
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import ListingEditClient from "./ListingEditClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ListingEditPage({ params, searchParams }) {
  const id = String(params?.id || "").trim();
  if (!id) return notFound();

  const s = await readSession();
  if (!s?.uid) redirect(`/login?next=${encodeURIComponent(`/listings/${id}/edit`)}`);

  const previewToken = String(searchParams?.token || "").trim();

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return notFound();

  if (listing.ownerId !== s.uid) redirect(`/listings/${id}${previewToken ? `?token=${encodeURIComponent(previewToken)}` : ""}`);

  const status = String(listing.status || "").toUpperCase();
  if (!["DRAFT", "REJECTED"].includes(status)) {
    // Editing blocked while pending/published/etc
    redirect(`/listings/${id}${previewToken ? `?token=${encodeURIComponent(previewToken)}` : ""}`);
  }

  const safe = JSON.parse(JSON.stringify(listing));
  return <ListingEditClient initialListing={safe} previewToken={previewToken} />;
}