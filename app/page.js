// app/page.js
import prisma from "../lib/prisma.js";
import Image from "next/image";
import ListingCard from "../components/ListingCard.js";
import AdvancedSearchBar from "../components/AdvancedSearchBar.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRID_SIZE = 16; // 4x4
const ROTATION_POOL_TAKE = 400;

// ✅ Filter out seeded/sample "example boat" images in /public/boats
const SAMPLE_IMAGE_PREFIX = "/boats/example-sailboat";
const SAMPLE_PLACEHOLDER_IMAGES = [
  "/boats/example-sailboat1.jpg",
  "/boats/example-sailboat2.jpg",
  "/boats/example-sailboat3.jpg",
  "/boats/example-sailboat4.jpg",
  "/boats/example-sailboat5.jpg",
  "/boats/example-sailboat6.JPG",
  "/boats/example-sailboat7.JPG",
  "/boats/example-sailboat8.jpg",
];

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
  const shuffledSamples = shuffleInPlace([...SAMPLE_PLACEHOLDER_IMAGES]);
  const samplePlaceholders = Array.from({ length: placeholdersNeeded }).map((_, i) => ({
    id: `sample-${i + 1}`,
    title: "",
    price: null,
    currency: "USD",
    year: null,
    builder: "",
    model: "",
    loa: null,
    loaUnit: "ft",
    locationCity: "",
    locationState: "",
    locationCountry: "",
    locationUsRegion: "",
    location: "Premium Listing Upgrade",
    heroImageUrl: shuffledSamples[i % shuffledSamples.length],
  }));

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-7xl px-5 md:px-8 pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(130deg,#ffffff_0%,#f8fafc_55%,#eef3f8_100%)] p-0 shadow-[0_16px_35px_rgba(2,6,23,0.12)]">
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-1 bg-[#c9972e]" />
          <div className="pointer-events-none absolute -right-20 -top-16 h-48 w-48 rounded-full bg-[#0a2230]/8 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-72 rounded-full bg-[#c9972e]/10 blur-2xl" />

          <div className="relative min-h-[136px]">
            <div className="absolute inset-y-0 left-0 hidden md:block w-[132px] overflow-hidden">
              <Image
                src="/hero-sailboat-welcome.jpg"
                alt="Sailboat underway at sunset"
                fill
                sizes="132px"
                className="object-cover object-[50%_95%]"
                priority
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a2230]/18 via-transparent to-transparent" />
            </div>

            <div className="relative grid grid-cols-1 gap-0 md:ml-[132px] md:grid-cols-[1fr_auto] md:items-stretch">
            <div className="px-4 py-4 sm:px-5 sm:py-5 md:px-6">
              <h2 className="text-2xl font-extrabold leading-tight text-[#0a2230] sm:text-3xl">
                Welcome Aboard the Launch of SailboatTrade.com!
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[#0a2230]/80 sm:text-base">
                Designed to be the best worldwide site for buying and selling sailboats.
              </p>
            </div>

            <div className="flex items-center px-4 pb-4 sm:px-5 sm:pb-5 md:justify-end md:px-6 md:py-5">
              <a
                href="/listings/new"
                className="inline-flex h-11 items-center justify-center rounded-full border-2 border-[#c9972e] bg-[#0a2230] px-6 text-sm font-extrabold text-white transition hover:bg-[#12364a]"
              >
                Create Free Listing
              </a>
            </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-[60] isolate mx-auto max-w-7xl px-5 md:px-8 pt-5">
        <AdvancedSearchBar variant="dark" />
      </div>

      <section className="relative z-0 mx-auto max-w-7xl px-5 md:px-8 py-10">
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

          <a href="/listings" className="text-sm font-semibold text-[#0a2230] hover:underline">
            See all
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredReal.map((listing) => (
            <ListingCard key={listing.id} listing={listing} variant="featured" imageFit="contain" hardNavigate />
          ))}

          {samplePlaceholders.map((sample) => (
            <ListingCard
              key={sample.id}
              listing={sample}
              variant="featured"
              imageFit="contain"
              hrefOverride="/listings/new"
              hardNavigate
              samplePlaceholder
            />
          ))}
        </div>
      </section>
    </main>
  );
}
