// components/FeaturedSailboatsSection.js
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import ListingCard from "@/components/ListingCard";

const GRID_SIZE = 16; // 4x4
const ROTATION_POOL_TAKE = 400; // pull a bigger pool so refreshes rotate nicely
const CREATE_LISTING_HREF = "/listings/new";

// ✅ Filter out seeded/sample "example boat" images in /public/boats
const SAMPLE_IMAGE_PREFIX = "/boats/example-sailboat";

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function PlaceholderCard({ i }) {
  return (
    <Link href={CREATE_LISTING_HREF} className="group block">
      <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white shadow-sm transition hover:shadow-md">
        <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="px-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border bg-white shadow-sm transition group-hover:scale-[1.03]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-base font-semibold text-[#0a2230]">
              Feature your sailboat here!
            </div>
            <div className="mt-1 text-sm text-slate-600">Upgrade a listing to featured placement</div>
          </div>
        </div>

        <div className="p-4">
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              Featured slot
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              Premium placement
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

export default async function FeaturedSailboatsSection() {
  noStore();

  const now = new Date();
  const published = await prisma.listing.findMany({
    where: {
      status: "PUBLISHED",
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
      // ✅ exclude sample listings that point at /public/boats/example-sailboat*.jpg
      NOT: [
        { heroImageUrl: { startsWith: SAMPLE_IMAGE_PREFIX } },
        // optional extra safety if you ever used a second image field:
        { imageUrl: { startsWith: SAMPLE_IMAGE_PREFIX } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: ROTATION_POOL_TAKE,
  });

  const shuffled = shuffleInPlace([...published]);
  const real = shuffled.slice(0, GRID_SIZE);

  const placeholdersNeeded = Math.max(0, GRID_SIZE - real.length);

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0a2230]">Featured Sailboats</h2>
          <p className="mt-1 text-sm text-slate-600">
            {published.length > GRID_SIZE
              ? "Showing a rotating selection — refresh to see more."
              : "All published listings appear here (placeholders fill remaining spots)."}
          </p>
        </div>

        <Link href="/listings" className="text-sm font-semibold text-[#0a2230] hover:underline">
          See all
        </Link>
      </div>

        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {real.map((listing) => (
          <ListingCard key={listing.id} listing={listing} variant="featured" />
        ))}

        {Array.from({ length: placeholdersNeeded }).map((_, i) => (
          <PlaceholderCard key={`ph-${i}`} i={i} />
        ))}
      </div>
    </section>
  );
}
