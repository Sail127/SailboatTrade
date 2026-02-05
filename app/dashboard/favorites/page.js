import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function Favorites() {
  const s = await requireUser();
  const favs = await prisma.favorite.findMany({
    where: { userId: s.uid },
    include: { listing: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Favorites</h1>
      <div className="mt-6 space-y-3">
        {favs.map((f) => (
          <div key={f.id} className="border rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{f.listing.title || "(Untitled)"}</div>
              <div className="text-sm text-gray-600">{f.listing.locationCity || "—"}</div>
            </div>
            <Link className="border rounded-md px-3 py-2 text-sm" href={`/listings/${f.listing.id}`}>
              View
            </Link>
          </div>
        ))}
        {favs.length === 0 && <div className="text-gray-600">No favorites yet.</div>}
      </div>
    </div>
  );
}
