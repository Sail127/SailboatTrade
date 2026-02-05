import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function MyListings() {
  const s = await requireUser();
  const listings = await prisma.listing.findMany({
    where: { ownerId: s.uid },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Listings</h1>
        <Link className="rounded-md bg-[#c8a44d] px-4 py-2 font-medium" href="/listings/new">
          Create listing
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {listings.map((l) => (
          <div key={l.id} className="border rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{l.title || "(Untitled)"}</div>
              <div className="text-sm text-gray-600">
                Status: {l.status} • Plan: {l.plan} • Payment: {l.paymentStatus}
              </div>
            </div>
            <div className="flex gap-2">
              <Link className="border rounded-md px-3 py-2 text-sm" href={`/listings/preview/${l.previewToken}`}>
                Preview
              </Link>
              <Link className="border rounded-md px-3 py-2 text-sm" href={`/dashboard/listings/${l.id}/edit`}>
                Edit
              </Link>
            </div>
          </div>
        ))}
        {listings.length === 0 && <div className="text-gray-600">No listings yet.</div>}
      </div>
    </div>
  );
}
