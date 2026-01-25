// components/ListingCard.js
import Image from "next/image";
import Link from "next/link";

function getFirstImageSrc(listing) {
  const candidates = [listing?.heroImageUrl, listing?.imageUrl, listing?.image].filter(Boolean);

  const imgs = listing?.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    if (typeof first === "string") candidates.push(first);
    else if (first && typeof first === "object") {
      candidates.push(first.url, first.src, first.imageUrl, first.heroImageUrl);
    }
  }

  let src = candidates.find((v) => typeof v === "string" && v.trim().length > 0);

  if (!src) src = "/boats/example-sailboat1.jpg";

  if (!src.startsWith("http://") && !src.startsWith("https://")) {
    src = src.replace(/^public\//, "");
    if (!src.startsWith("/")) src = `/${src}`;
  }

  return src;
}

function SpecPill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
      {children}
    </span>
  );
}

export default function ListingCard({ listing, variant = "default" }) {
  const {
    id,
    title,
    price,
    currency = "USD",
    year,
    builder,
    make,
    model,
    length,
    lengthUnit = "ft",
    location,
    locationCity,
    locationCountry,
  } = listing || {};

  const displayBuilder = builder || make;
  const displayTitle = [displayBuilder, model].filter(Boolean).join(" ") || title || "Untitled";

  const photo = getFirstImageSrc(listing);
  const isRemote = photo.startsWith("http://") || photo.startsWith("https://");

  const priceText = price ? `${currency} ${Number(price).toLocaleString()}` : "Price on request";

  // One-line descriptor for featured cards
  const featuredLine = [year, displayBuilder, model].filter(Boolean).join(" ");

  const displayLocation =
    location || [locationCity, locationCountry].filter(Boolean).join(", ") || null;

  const isFeatured = variant === "featured";

  return (
    <Link
      href={`/listings/${id}`}
      className="
        group block overflow-hidden rounded-2xl
        border border-slate-200 bg-white
        shadow-sm hover:shadow-lg
        transition
      "
    >
      <div className="relative h-48 sm:h-56">
        <Image
          src={photo}
          alt={displayTitle}
          fill
          className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          unoptimized={isRemote}
        />

        {/* Subtle darken for readability + premium look */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

        {/* Soft highlight on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5" />
      </div>

      <div className="p-4">
        {isFeatured ? (
          <div className="text-[14px] font-semibold text-slate-900 group-hover:text-[#0a2230] line-clamp-1">
            {featuredLine || displayTitle}
          </div>
        ) : (
          <>
            <h3 className="text-[15px] font-semibold text-slate-900 group-hover:text-[#0a2230] line-clamp-1">
              {displayTitle}
            </h3>

            <div className="mt-2 flex flex-wrap gap-2">
              {year && <SpecPill>{year}</SpecPill>}
              {length && (
                <SpecPill>
                  {length} {lengthUnit}
                </SpecPill>
              )}
            </div>

            <div className="mt-3 text-sm font-semibold text-slate-900">
              {priceText}
            </div>

            {displayLocation && (
              <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                {displayLocation}
              </p>
            )}
          </>
        )}
      </div>
    </Link>
  );
}
