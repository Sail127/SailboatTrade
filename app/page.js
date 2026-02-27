// app/page.js
import prisma from "../lib/prisma.js";
import Link from "next/link";
import ListingCard from "../components/ListingCard.js";
import AdvancedSearchBar from "../components/AdvancedSearchBar.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRID_SIZE = 16; // 4x4
const ROTATION_POOL_TAKE = 400;

// ✅ Filter out seeded/sample "example boat" images in /public/boats
const SAMPLE_IMAGE_PREFIX = "/boats/example-sailboat";

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
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="pointer-events-none absolute inset-0" style={{ opacity: 0.14, filter: "blur(0.35px)" }}>
            <svg viewBox="0 0 800 500" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M0 360c60 0 60-20 120-20s60 20 120 20 60-20 120-20 60 20 120 20 60-20 120-20 60 20 120 20" stroke="#0a2230" strokeWidth="10" strokeLinecap="round" />
              <path d="M0 410c60 0 60-20 120-20s60 20 120 20 60-20 120-20 60 20 120 20 60-20 120-20 60 20 120 20" stroke="#0a2230" strokeWidth="10" strokeLinecap="round" />
              <path d="M260 330h320c-30 40-90 75-160 75s-130-35-160-75Z" stroke="#0a2230" strokeWidth="12" strokeLinejoin="round" />
              <path d="M420 120v215" stroke="#0a2230" strokeWidth="12" strokeLinecap="round" />
              <path d="M420 130c-55 50-110 135-120 190h120V130Z" stroke="#0a2230" strokeWidth="12" strokeLinejoin="round" />
              <path d="M420 155c70 55 115 120 130 165H420V155Z" stroke="#0a2230" strokeWidth="12" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="pointer-events-none absolute inset-0 bg-white/45" />

          <div className="relative z-10 flex h-full items-center justify-center">
            <div className="px-6 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border bg-white shadow-sm transition group-hover:scale-[1.03]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-base font-semibold text-[#0a2230]">Feature your sailboat here!</div>
              <div className="mt-1 text-sm text-slate-600">Premium featured placement</div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Featured slot</span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Premium placement</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Featured listings replace placeholders as they’re published.
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function Home() {
  let poolRaw = [];
  try {
    const now = new Date();
    poolRaw = await prisma.listing.findMany({
      where: {
        status: "PUBLISHED",
        featuredHome: true,
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },

          // ✅ Exclude seeded example hero images (safe + supported)
          // NOTE: Prisma cannot do startsWith on elements inside the imageUrls string[] field.
          { heroImageUrl: { not: null } },
          { heroImageUrl: { not: "" } },
          { NOT: { heroImageUrl: { startsWith: SAMPLE_IMAGE_PREFIX } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: ROTATION_POOL_TAKE,
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        year: true,
        builder: true,
        model: true,
        loa: true,
        loaUnit: true,
        locationCity: true,
        locationState: true,
        locationCountry: true,
        locationUsRegion: true,
        heroImageUrl: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    console.error("Home page findMany error:", err);
    poolRaw = [];
  }

  const pool = (poolRaw ?? []).map((l) => ({
    ...l,
    make: l.builder ?? null,
    length: l.loa ?? null,
    lengthUnit: l.loaUnit ?? null,
    priceCurrency: l.currency ?? "USD",
  }));

  const totalReal = pool.length;

  const shuffled = shuffleInPlace([...pool]);
  const featuredReal = shuffled.slice(0, GRID_SIZE);
  const placeholdersNeeded = Math.max(0, GRID_SIZE - featuredReal.length);

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-7xl px-5 md:px-8 pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-[#f3b23f]/45 bg-[linear-gradient(120deg,#fff3c4_0%,#f8d886_38%,#d8eef7_100%)] px-6 py-7 sm:px-8 sm:py-9 shadow-[0_16px_35px_rgba(2,6,23,0.18)]">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#f3b23f]/30 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-32 w-64 rounded-full bg-[#60a5fa]/20 blur-2xl" />

          <div className="relative grid grid-cols-1 gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.18em] text-[#0a2230]/75">SAILBOATTRADE.COM</p>
              <h2 className="mt-2 text-2xl font-extrabold leading-tight text-[#0a2230] sm:text-3xl">
                List your sailboat where serious sailors search first.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[#0a2230]/80 sm:text-base">
                Create a basic listing today for free and discover why we are the best place to sell and buy SailBoats!
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <Link
                href="/listings/new"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#f3b23f] px-6 text-sm font-extrabold text-[#0a2230] hover:bg-[#f9c860]"
              >
                Start Free Listing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 md:px-8 pt-5">
        <AdvancedSearchBar variant="dark" />
      </div>

      <section className="mx-auto max-w-7xl px-5 md:px-8 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#0a2230]">Featured Sailboats</h2>
            <p className="text-sm text-slate-600">
              {totalReal > 0
                ? totalReal > GRID_SIZE
                  ? "Showing a rotating selection — refresh to see more listings."
                  : "All current listings are shown here."
                : "No featured listings yet — placeholders will be replaced as featured boats are published."}
            </p>
          </div>

          <Link href="/listings" className="text-sm font-semibold text-[#0a2230] hover:underline">
            See all
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredReal.map((listing) => (
            <ListingCard key={listing.id} listing={listing} variant="featured" />
          ))}

          {Array.from({ length: placeholdersNeeded }).map((_, i) => (
            <PlaceholderCard key={`ph-${i}`} />
          ))}
        </div>
      </section>
    </main>
  );
}
