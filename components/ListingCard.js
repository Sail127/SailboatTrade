// components/ListingCard.js
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

function resolveImage(listing) {
  const candidates = [listing?.heroImageUrl, listing?.imageUrl, listing?.image].filter(Boolean);

  const imageUrls = listing?.imageUrls;
  if (Array.isArray(imageUrls) && imageUrls.length > 0) candidates.push(imageUrls[0]);

  const imgs = listing?.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    if (typeof first === "string") candidates.push(first);
    else if (first && typeof first === "object") {
      candidates.push(first.url, first.src, first.imageUrl, first.heroImageUrl);
    }
  }

  let src = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  if (!src) return "/boats/example-sailboat1.jpg";

  src = String(src).trim();

  // Remote URL
  if (src.startsWith("http://") || src.startsWith("https://")) return src;

  // Local/public path
  if (src.startsWith("/")) return src;
  src = src.replace(/^public\//, "");
  if (src.startsWith("boats/") || src.startsWith("images/")) return `/${src}`;

  // R2 key via your endpoint
  const qp = new URLSearchParams({ key: src });
  return `/api/uploads?${qp.toString()}`;
}

function money(value, currency = "USD") {
  if (value == null || value === "") return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency || "USD"),
      maximumFractionDigits: 0,
    }).format(Number(value));
  } catch {
    return `${Number(value).toLocaleString()} ${currency}`;
  }
}

function hullLabel(v) {
  if (!v) return null;
  const s = String(v).toUpperCase();
  if (s === "MONOHULL") return "Monohull";
  if (s === "CATAMARAN") return "Catamaran";
  if (s === "TRIMARAN") return "Trimaran";
  return v;
}

function usRegionLabel(v) {
  const s = String(v || "").toUpperCase();
  if (s === "WEST_COAST") return "West Coast";
  if (s === "EAST_COAST") return "East Coast";
  if (s === "GULF_COAST") return "Gulf Coast";
  if (s === "GREAT_LAKES") return "Great Lakes";
  if (s === "HAWAII") return "Hawaii";
  if (s === "OTHER_INLAND_WATERS") return "Other Inland waters";
  if (s === "OTHER_US_TERRITORIAL") return "Other U.S. Territorial waters";
  return "";
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
      {children}
    </span>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 drop-shadow-[0_1px_2px_rgba(2,6,23,0.6)]"
      fill={filled ? "rgba(255,255,255,0.9)" : "none"}
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.8l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.4 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

export default function ListingCard({
  listing,
  variant = "default",
  imageFit = "cover",
  showFavorite = false,
  hrefOverride = null,
  imageTopLabel = "",
}) {
  const {
    id,
    title,
    price,
    currency = "USD",
    year,
    builder,
    model,

    loa,
    loaUnit,

    cabins,
    heads,
    type,

    locationCity,
    locationState,
    locationCountry,
    locationUsRegion,
    location,
    viewerFavorited,
    viewerLoggedIn,
  } = listing || {};

  const [favorited, setFavorited] = useState(Boolean(viewerFavorited));
  const [favBusy, setFavBusy] = useState(false);

  useEffect(() => {
    setFavorited(Boolean(viewerFavorited));
  }, [id, viewerFavorited]);

  const displayTitle = [builder, model].filter(Boolean).join(" ") || title || "Untitled";
  const topTitle = [year, builder, model].filter(Boolean).join(" ") || displayTitle;
  const lengthText = loa != null ? `${loa} ${loaUnit || "ft"}` : "";
  const photo = resolveImage(listing);
  const isRemote = photo.startsWith("http://") || photo.startsWith("https://");
  const isUnoptimized = isRemote || photo.startsWith("/api/uploads");

  const priceText = money(price, currency) || "Price on request";

  const countryUpper = String(locationCountry || "").toUpperCase();
  const regionText = countryUpper === "US" ? usRegionLabel(locationUsRegion) : "";
  const cityState = [locationCity, locationState].map((x) => String(x || "").trim()).filter(Boolean).join(", ");

  const loc =
    location ||
    (countryUpper === "US"
      ? [cityState, [regionText, "US"].filter(Boolean).join(", ")].filter(Boolean).join(" · ")
      : [locationCity, locationState, locationCountry].map((x) => String(x || "").trim()).filter(Boolean).join(", ")) ||
    null;

  const hull = hullLabel(type);
  const isFeatured = variant === "featured";
  const useContain = isFeatured || imageFit === "contain";
  const canFavorite = showFavorite && Boolean(id);
  const imageClass = useContain
    ? "object-contain object-center bg-slate-100"
    : "object-cover object-center transition-transform duration-300 group-hover:scale-105";

  async function onToggleFavorite(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!canFavorite || favBusy) return;

    if (!viewerLoggedIn) {
      if (typeof window !== "undefined") {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
      }
      return;
    }

    const prev = favorited;
    setFavorited(!prev);
    setFavBusy(true);

    try {
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        if (res.status === 401 && typeof window !== "undefined") {
          const next = `${window.location.pathname}${window.location.search}`;
          window.location.assign(`/login?next=${encodeURIComponent(next)}`);
        }
        throw new Error(data?.error || "Could not update favorites.");
      }

      setFavorited(Boolean(data?.favorited));
    } catch {
      setFavorited(prev);
    } finally {
      setFavBusy(false);
    }
  }

  return (
    <Link
      href={hrefOverride || (id ? `/listings/${id}` : "/listings/new")}
      className="
        group block overflow-hidden rounded-2xl
        border border-slate-200 bg-white
        shadow-[0_8px_18px_rgba(15,23,42,0.08)]
        hover:shadow-[0_18px_30px_rgba(15,23,42,0.18)] hover:-translate-y-1
        transition-all duration-300
      "
    >
      {!isFeatured ? (
        <div className="px-3 pt-2 pb-1">
          <h3 className="line-clamp-1 text-lg font-bold text-slate-900 group-hover:text-[#0a2230] sm:text-[20px]">
            {topTitle}
          </h3>
        </div>
      ) : null}

      <div className="relative h-56 sm:h-64">
        <Image
          src={photo}
          alt={displayTitle}
          fill
          className={imageClass}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          unoptimized={isUnoptimized}
        />

        {!useContain ? (
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
        ) : null}

        {imageTopLabel ? (
          <div className="absolute top-2 inset-x-0 text-center px-3">
            <span className="text-xs font-extrabold tracking-wide text-white drop-shadow-[0_2px_6px_rgba(2,6,23,0.75)]">
              {imageTopLabel}
            </span>
          </div>
        ) : null}

        {canFavorite ? (
          <button
            type="button"
            onClick={onToggleFavorite}
            disabled={favBusy}
            className={[
              "absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center transition",
              favBusy
                ? "cursor-not-allowed opacity-70"
                : "opacity-95 hover:opacity-100",
            ].join(" ")}
            title={favorited ? "Remove from favorites" : "Save to favorites"}
            aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
          >
            {favBusy ? "…" : <HeartIcon filled={favorited} />}
          </button>
        ) : null}
      </div>

      <div className="px-4 pt-4 pb-2">
        {isFeatured ? (
          <h3 className="line-clamp-1 text-[15px] font-semibold text-slate-900 group-hover:text-[#0a2230]">
            {topTitle}
          </h3>
        ) : null}

        {!isFeatured ? (
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="text-[17px] font-bold leading-none text-[#0a2230]">
              {priceText}
            </div>
            {lengthText ? (
              <div className="text-[15px] font-semibold leading-none text-slate-700">
                {lengthText}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={`${isFeatured ? "mt-2" : "mt-1"} flex flex-wrap gap-2`}>
          {isFeatured && loa != null ? <Pill>{loa} {loaUnit || "ft"}</Pill> : null}
          {hull ? <Pill>{hull}</Pill> : null}
          {cabins != null ? <Pill>{cabins} cabins</Pill> : null}
          {heads != null ? <Pill>{heads} heads</Pill> : null}
        </div>

        {loc ? (
          <div className="mt-3 flex items-center gap-1.5 text-[13px] text-slate-600">
            <span className="text-slate-400"><PinIcon /></span>
            <span className="line-clamp-1">{loc}</span>
          </div>
        ) : (
          <div className="mt-3 text-[13px] text-slate-400"> </div>
        )}
      </div>
    </Link>
  );
}
