// app/listings/preview/[token]/page.js
import prisma from "@/lib/prisma";
import ListingDetail from "@/components/ListingDetail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function coerceArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;

  // Back-compat if something was stored as JSON text at some point
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

export default async function PreviewListingPage({ params }) {
  const token = String(params.token || "").trim();
  if (!token) {
    return <div className="mx-auto max-w-7xl px-5 md:px-8 py-12">Preview not found.</div>;
  }

  const listing = await prisma.listing.findFirst({
    where: {
      previewToken: token,
      status: { in: ["DRAFT", "READY_FOR_CHECKOUT"] },
    },
  });

  if (!listing) {
    return <div className="mx-auto max-w-7xl px-5 md:px-8 py-12">Preview not found.</div>;
  }

  const normalized = {
    ...listing,
    imageUrls: coerceArray(listing.imageUrls),
    equipment: coerceArray(listing.equipment),
    __previewToken: token, // required for /api/uploads?token=...
  };

  return <ListingDetail listing={normalized} />;
}
