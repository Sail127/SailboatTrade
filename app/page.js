// app/page.js
import prisma from "../lib/prisma.js";
import Image from "next/image";
import ListingCard from "../components/ListingCard.js";
import AdvancedSearchBar from "../components/AdvancedSearchBar.js";

function DollarIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#f3b23f"
        d="M12 2c.6 0 1 .4 1 1v1.1c2.3.3 4 1.6 4.6 3.6.2.5-.1 1.1-.7 1.3-.5.2-1.1-.1-1.3-.7-.4-1.3-1.5-2.1-3.1-2.3V12c2.9.6 4.8 2 4.8 4.7 0 2.4-1.8 3.9-4.8 4.2V22c0 .6-.4 1-1 1s-1-.4-1-1v-1.1c-2.6-.3-4.5-1.7-5.1-4-.2-.5.2-1.1.7-1.3.5-.2 1.1.2 1.3.7.5 1.6 1.8 2.5 3.1 2.7v-5.6c-2.7-.6-4.6-1.9-4.6-4.6 0-2.3 1.7-3.8 4.6-4.1V3c0-.6.4-1 1-1Zm-1 5.2c-1.6.2-2.6 1-2.6 2.3 0 1.4 1 2 2.6 2.4V7.2Zm2 12.6c1.9-.2 2.9-1 2.9-2.5 0-1.6-1.2-2.2-2.9-2.6v5.1Z"
      />
    </svg>
  );
}

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

function isMissingHeroImageFrameColumn(error) {
  const message = String(error?.message || "");
  return message.includes("Listing.heroImageFrame") && message.includes("does not exist");
}

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
    const where = {
      status: "PUBLISHED",
      featuredHome: true,
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { heroImageUrl: { not: null } },
        { heroImageUrl: { not: "" } },
        { NOT: { heroImageUrl: { startsWith: SAMPLE_IMAGE_PREFIX } } },
      ],
    };
    const baseSelect = {
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
    };

    try {
      poolRaw = await prisma.listing.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: ROTATION_POOL_TAKE,
        select: {
          ...baseSelect,
          heroImageFrame: true,
        },
      });
    } catch (error) {
      if (!isMissingHeroImageFrameColumn(error)) throw error;

      poolRaw = await prisma.listing.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: ROTATION_POOL_TAKE,
        select: baseSelect,
      });
    }
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-2 border-[#c9972e] bg-[#0a2230] px-6 text-sm font-extrabold text-white transition hover:bg-[#12364a]"
              >
                <DollarIcon className="h-6 w-6" />
                Create Free Listing
              </a>
            </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 isolate mx-auto max-w-7xl px-5 md:px-8 pt-5">
        <AdvancedSearchBar variant="dark" />
      </div>

      <section className="relative z-0 mx-auto max-w-7xl px-5 md:px-8 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#0a2230]">Featured Sailboats</h2>
            <p className="text-sm text-slate-600">Upgraded listings shown on homepage.</p>
          </div>

          <a href="/listings" className="text-sm font-semibold text-[#0a2230] hover:underline">
            See all
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredReal.map((listing) => (
            <ListingCard key={listing.id} listing={listing} variant="featured" hardNavigate />
          ))}

          {samplePlaceholders.map((sample) => (
            <ListingCard
              key={sample.id}
              listing={sample}
              variant="featured"
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
