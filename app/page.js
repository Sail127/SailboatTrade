// app/page.js
import prisma from "../lib/prisma.js";
import Link from "next/link";
import ListingCard from "../components/ListingCard.js";
import AdvancedSearchBar from "../components/AdvancedSearchBar.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  const featuredRaw = await prisma.listing.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    take: 16,
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      year: true,
      make: true,
      model: true,
      length: true,
      locationCity: true,
      locationCountry: true,
      heroImageUrl: true,
      updatedAt: true,
    },
  });

  const featured = featuredRaw.map((l) => ({
    ...l,
    priceCurrency: l.currency ?? "USD",
  }));

  return (
    <main className="bg-white">
      {/* Top spacing so content clears sticky header */}
      <div className="mx-auto max-w-7xl px-5 md:px-8 pt-6">
        <AdvancedSearchBar variant="dark" />
      </div>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#0a2230]">
              Featured Sailboats
            </h2>
            <p className="text-sm text-slate-600">
              Hand-picked listings to spark your next passage.
            </p>
          </div>

          <Link
            href="/listings"
            className="text-sm font-semibold text-[#0a2230] hover:underline"
          >
            See all
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </main>
  );
}
