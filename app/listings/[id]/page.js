// app/listings/[id]/page.js
import prisma from "../../../lib/prisma.js";
import ListingDetail from "../../../components/ListingDetail.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ListingPage({ params }) {
  const id = Number(params.id);
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return <div className="mx-auto max-w-7xl px-5 md:px-8 py-12 text-white">Listing not found.</div>;

  // Normalize imageUrls if it’s stored as JSON/text
  function coerceArray(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
      try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  }

  const normalized = {
    ...listing,
    imageUrls: coerceArray(listing.imageUrls),
    // If you later add a related images table, map it to {url} here as well.
  };

  return <ListingDetail listing={normalized} />;
}
