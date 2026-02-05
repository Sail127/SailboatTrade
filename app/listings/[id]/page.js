// app/listings/[id]/page.js
import prisma from "@/lib/prisma";
import ListingDetail from "@/components/ListingDetail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function coerceArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default async function ListingPage({ params }) {
  const id = String(params.id || "").trim();
  if (!id) {
    return (
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-12">
        Listing not found.
      </div>
    );
  }

  const listing = await prisma.listing.findUnique({ where: { id } });

  // ✅ PRIVATE UNTIL PUBLISHED
  if (!listing || listing.status !== "PUBLISHED") {
    return (
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-12">
        Listing not found.
      </div>
    );
  }

  const normalized = {
    ...listing,
    imageUrls: coerceArray(listing.imageUrls),
    equipment: coerceArray(listing.equipment),
  };

  return <ListingDetail listing={normalized} />;
}
