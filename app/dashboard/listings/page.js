// app/dashboard/listings/page.js
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import RowActions from "./RowActions";

export const dynamic = "force-dynamic";

export default async function MyListings() {
  const s = await requireUser();
  const listings = await prisma.listing.findMany({
    where: { ownerId: s.uid },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      plan: true,
      paymentStatus: true,
      previewToken: true,
      updatedAt: true,
    },
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
          <div key={l.id} className="border rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium">{l.title || "(Untitled)"}</div>
              <div className="text-sm text-gray-600">
                Status: {l.status} • Plan: {l.plan} • Payment: {l.paymentStatus}
              </div>
            </div>

            <RowActions
              id={l.id}
              status={l.status}
              previewToken={l.previewToken}
            />
          </div>
        ))}

        {listings.length === 0 && <div className="text-gray-600">No listings yet.</div>}
      </div>
    </div>
  );
}
