// app/page.js
import prisma from "../lib/prisma.js";
import Link from "next/link";
import ListingCard from "../components/ListingCard.js";
import AdvancedSearchBar from "../components/AdvancedSearchBar.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRID_SIZE = 16; // 4x4
const ROTATION_POOL_TAKE = 400; // pull a larger pool so refreshes rotate listings nicely

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function PlaceholderCard() {
  return (
    <Link href="/listings/new" className="group block">
      <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white shadow-sm transition hover:shadow-md">
        {/* TOP IMAGE AREA (now with subtle sailing graphic behind text) */}
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
          {/* Subtle sailing line-art background (guaranteed visible) */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ opacity: 0.14, filter: "blur(0.35px)" }}
          >
            <svg
              viewBox="0 0 800 500"
              className="h-full w-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Waves */}
              <path
                d="M0 360c60 0 60-20 120-20s60 20 120 20 60-20 120-20 60 20 120 20 60-20 120-20 60 20 120 20"
                stroke="#0a2230"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M0 410c60 0 60-20 120-20s60 20 120 20 60-20 120-20 60 20 120 20 60-20 120-20 60 20 120 20"
                stroke="#0a2230"
                strokeWidth="10"
                strokeLinecap="round"
              />

              {/* Hull */}
              <path
                d="M260 330h320c-30 40-90 75-160 75s-130-35-160-75Z"
                stroke="#0a2230"
                strokeWidth="12"
                strokeLinejoin="round"
              />

              {/* Mast */}
              <path
                d="M420 120v215"
                stroke="#0a2230"
                strokeWidth="12"
                strokeLinecap="round"
              />

              {/* Main sail */}
              <path
                d="M420 130c-55 50-110 135-120 190h120V130Z"
                stroke="#0a2230"
                strokeWidth="12"
                strokeLinejoin="round"
              />

              {/* Jib */}
              <path
                d="M420 155c70 55 115 120 130 165H420V155Z"
                stroke="#0a2230"
                strokeWidth="12"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Soft overlay (lighter than before so the art shows) */}
          <div className="pointer-events-none absolute inset-0 bg-white/45" />

          {/* Foreground content */}
          <div className="relative z-10 flex h-full items-center justify-center">
            <div className="px-6 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border bg-white shadow-sm transition group-hover:scale-[1.03]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="text-base font-semibold text-[#0a2230]">
                Advertise your sailboat here for free!
              </div>
              <div className="mt-1 text-sm text-slate-600">Click to create a listing</div>
            </div>
          </div>
        </div>

        {/* BOTTOM AREA */}
        <div className="p-4">
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              Free
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              Shows on homepage
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Publish your listing and it will automatically replace placeholders.
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function Home() {
  // Pull a larger pool so the 4x4 grid changes on refresh
  let poolRaw = [];
  try {
    poolRaw = await prisma.listing.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      take: ROTATION_POOL_TAKE,
      // ✅ NEW schema-safe select (NO make/length)
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        year: true,

        builder: true, // ✅ replaces make
        model: true,

        loa: true,     // ✅ replaces length
        loaUnit: true,

        locationCity: true,
        locationCountry: true,
        heroImageUrl: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    console.error("Home page findMany error:", err);
    poolRaw = [];
  }

  // ✅ Compatibility mapping so older components expecting make/length don't crash
  const pool = (poolRaw ?? []).map((l) => ({
    ...l,
    make: l.builder ?? null,         // legacy
    length: l.loa ?? null,           // legacy
    lengthUnit: l.loaUnit ?? null,   // legacy
    priceCurrency: l.currency ?? "USD",
  }));

  const totalReal = pool.length;

  // Randomize every request; keep real listings first; placeholders fill the rest
  const shuffled = shuffleInPlace([...pool]);

  const featuredReal = shuffled.slice(0, GRID_SIZE);

  const placeholdersNeeded = Math.max(0, GRID_SIZE - featuredReal.length);

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 pt-6">
        <AdvancedSearchBar variant="dark" />
      </div>

      <section className="mx-auto max-w-7xl px-5 md:px-8 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#0a2230]">
              Featured Sailboats
            </h2>
            <p className="text-sm text-slate-600">
              {totalReal > 0
                ? totalReal > GRID_SIZE
                  ? "Showing a rotating selection — refresh to see more listings."
                  : "All current listings are shown here."
                : "No listings yet — placeholders will be replaced automatically as boats are published."}
            </p>
          </div>

          <Link href="/listings" className="text-sm font-semibold text-[#0a2230] hover:underline">
            See all
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Real listings FIRST */}
          {featuredReal.map((listing) => (
            <ListingCard key={listing.id} listing={listing} variant="featured" />
          ))}

          {/* Placeholders fill remaining spots up to 16 */}
          {Array.from({ length: placeholdersNeeded }).map((_, i) => (
            <PlaceholderCard key={`ph-${i}`} />
          ))}
        </div>
      </section>
    </main>
  );
}
