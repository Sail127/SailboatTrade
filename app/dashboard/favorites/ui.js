"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const US_REGION_LABELS = {
  WEST_COAST: "West Coast",
  EAST_COAST: "East Coast",
  GULF_COAST: "Gulf Coast",
  GREAT_LAKES: "Great Lakes",
  HAWAII: "Hawaii",
  OTHER_INLAND_WATERS: "Other Inland waters",
  OTHER_US_TERRITORIAL: "Other U.S. Territorial waters",
};

function imageUrlFromKey(value) {
  const src = String(value || "").trim();
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("/")) return src;
  const normalized = src.replace(/^public\//, "");
  if (normalized.startsWith("boats/") || normalized.startsWith("images/")) return `/${normalized}`;
  return `/api/uploads?key=${encodeURIComponent(src)}`;
}

function getHeroImage(listing) {
  if (!listing) return "/boats/example-sailboat1.jpg";
  if (listing.heroImageUrl) return imageUrlFromKey(listing.heroImageUrl);
  if (Array.isArray(listing.imageUrls) && listing.imageUrls.length > 0) {
    return imageUrlFromKey(listing.imageUrls[0]);
  }
  return "/boats/example-sailboat1.jpg";
}

function listingTitle(listing) {
  const title = [listing?.year, listing?.builder, listing?.model]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(" ");
  return title || String(listing?.title || "(Untitled)").trim();
}

function toMoney(value, currency = "USD") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency || "USD"),
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString()} ${currency}`.trim();
  }
}

function toHull(v) {
  const s = String(v || "").toUpperCase();
  if (s === "MONOHULL") return "Monohull";
  if (s === "CATAMARAN") return "Catamaran";
  if (s === "TRIMARAN") return "Trimaran";
  return String(v || "");
}

function locationLine(listing) {
  const city = String(listing?.locationCity || "").trim();
  const state = String(listing?.locationState || "").trim();
  const country = String(listing?.locationCountry || "").trim();
  const countryUpper = country.toUpperCase();
  const region = US_REGION_LABELS[String(listing?.locationUsRegion || "").toUpperCase()] || "";

  if (countryUpper === "US") {
    return [city, state, region, "US"].filter(Boolean).join(", ");
  }
  return [city, state, country].filter(Boolean).join(", ");
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isAvailable(listing) {
  const status = String(listing?.status || "").toUpperCase();
  if (status !== "PUBLISHED") return false;
  if (!listing?.expiresAt) return true;
  const expires = new Date(listing.expiresAt);
  if (Number.isNaN(expires.getTime())) return true;
  return expires.getTime() > Date.now();
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
      {children}
    </span>
  );
}

export default function FavoritesUI({ initialItems = [] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busyListingId, setBusyListingId] = useState("");
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("saved_newest");

  const decorated = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        available: isAvailable(item.listing),
      })),
    [items]
  );

  const totalCount = decorated.length;
  const activeCount = decorated.filter((x) => x.available).length;
  const unavailableCount = totalCount - activeCount;

  const visibleItems = useMemo(() => {
    let next = decorated;
    if (filter === "active") next = next.filter((x) => x.available);
    if (filter === "unavailable") next = next.filter((x) => !x.available);

    const byNumber = (aValue, bValue, ascending = true) => {
      const aNumber = Number(aValue);
      const bNumber = Number(bValue);
      const aOk = Number.isFinite(aNumber);
      const bOk = Number.isFinite(bNumber);
      if (!aOk && !bOk) return 0;
      if (!aOk) return 1;
      if (!bOk) return -1;
      return ascending ? aNumber - bNumber : bNumber - aNumber;
    };

    return [...next].sort((a, b) => {
      if (sortBy === "saved_oldest") {
        return byNumber(new Date(a.createdAt).getTime(), new Date(b.createdAt).getTime(), true);
      }
      if (sortBy === "year_newest") {
        return byNumber(a.listing?.year, b.listing?.year, false);
      }
      if (sortBy === "year_oldest") {
        return byNumber(a.listing?.year, b.listing?.year, true);
      }
      if (sortBy === "price_high") {
        return byNumber(a.listing?.price, b.listing?.price, false);
      }
      if (sortBy === "price_low") {
        return byNumber(a.listing?.price, b.listing?.price, true);
      }
      return byNumber(new Date(a.createdAt).getTime(), new Date(b.createdAt).getTime(), false);
    });
  }, [decorated, filter, sortBy]);

  async function removeFavorite(listingId) {
    if (!listingId || busyListingId) return;

    setBusyListingId(listingId);
    setMsg("");
    try {
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not update favorites.");
      }

      setItems((prev) => prev.filter((x) => x.listing?.id !== listingId));
      setMsg("Removed from favorites.");
      setTimeout(() => setMsg(""), 2200);
    } catch (err) {
      setMsg(err?.message || "Could not update favorites.");
      setTimeout(() => setMsg(""), 2500);
    } finally {
      setBusyListingId("");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0a2230]">My Favorites</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track the sailboats you like and quickly jump back when you are ready.
          </p>
        </div>
        <Link
          href="/listings"
          className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50"
        >
          Browse Sailboats
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[12px] font-semibold tracking-wide text-slate-500">Saved Boats</div>
          <div className="mt-1 text-2xl font-extrabold text-[#0a2230]">{totalCount}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="text-[12px] font-semibold tracking-wide text-emerald-700">Active Listings</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-800">{activeCount}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="text-[12px] font-semibold tracking-wide text-amber-700">Unavailable</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-800">{unavailableCount}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-[12px] font-semibold ${
              filter === "all"
                ? "border-[#0a2230] bg-[#0a2230] text-white"
                : "border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-[12px] font-semibold ${
              filter === "active"
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unavailable")}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-[12px] font-semibold ${
              filter === "unavailable"
                ? "border-amber-700 bg-amber-700 text-white"
                : "border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
            }`}
          >
            Unavailable ({unavailableCount})
          </button>
        </div>

        <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-600">
          Sort by
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 rounded-full border border-slate-300 bg-white px-3 text-[12px] font-semibold text-[#0a2230] outline-none ring-[#c8a44d]/40 focus:ring-2"
          >
            <option value="saved_newest">Saved: Newest</option>
            <option value="saved_oldest">Saved: Oldest</option>
            <option value="year_newest">Year: Newest</option>
            <option value="year_oldest">Year: Oldest</option>
            <option value="price_high">Price: High to low</option>
            <option value="price_low">Price: Low to high</option>
          </select>
        </label>
      </div>

      {msg ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          {msg}
        </div>
      ) : null}

      {totalCount === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="text-lg font-bold text-[#0a2230]">No favorites yet</div>
          <p className="mt-2 text-sm text-slate-600">
            Tap the heart icon on any listing to save it here.
          </p>
          <div className="mt-5">
            <Link
              href="/listings"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#f3b23f] px-5 text-sm font-semibold text-[#0a2230] hover:brightness-95"
            >
              Explore Listings
            </Link>
          </div>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-600">
          No listings match this filter.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => {
            const listing = item.listing || {};
            const id = String(listing.id || "");
            const available = item.available;
            const heartBusy = busyListingId === id;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_22px_rgba(2,6,23,0.08)]"
              >
                <div className="relative aspect-[16/10] border-b border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getHeroImage(listing)}
                    alt={listingTitle(listing)}
                    className="h-full w-full object-contain bg-slate-100 p-2"
                    loading="lazy"
                  />

                  <div className="absolute left-3 top-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        available
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {available ? "Active" : "Unavailable"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFavorite(id)}
                    disabled={heartBusy}
                    className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border text-[16px] ${
                      heartBusy
                        ? "cursor-not-allowed border-slate-300 bg-white/80 text-slate-400"
                        : "border-red-200 bg-white text-red-600 hover:bg-red-50"
                    }`}
                    title="Remove from favorites"
                    aria-label="Remove from favorites"
                  >
                    {heartBusy ? "…" : "♥"}
                  </button>

                  {toMoney(listing?.price, listing?.currency || "USD") ? (
                    <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-[#0a2230] shadow-sm">
                      {toMoney(listing?.price, listing?.currency || "USD")}
                    </div>
                  ) : null}
                </div>

                <div className="p-4">
                  <h2 className="line-clamp-1 text-[16px] font-bold text-[#0a2230]">
                    {listingTitle(listing)}
                  </h2>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {listing?.year ? <Pill>{listing.year}</Pill> : null}
                    {listing?.loa != null ? <Pill>{listing.loa} {listing.loaUnit || "ft"}</Pill> : null}
                    {toHull(listing?.type) ? <Pill>{toHull(listing?.type)}</Pill> : null}
                  </div>

                  <div className="mt-3 line-clamp-1 text-[12px] text-slate-600">
                    {locationLine(listing) || "Location not provided"}
                  </div>

                  <div className="mt-1 text-[12px] text-slate-500">
                    Saved on {fmtDate(item.createdAt)}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    {available ? (
                      <Link
                        href={`/listings/${encodeURIComponent(id)}`}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-[12px] font-semibold text-[#0a2230] hover:bg-slate-50"
                      >
                        View Listing
                      </Link>
                    ) : (
                      <span className="text-[12px] font-semibold text-amber-700">
                        Listing not currently public
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => removeFavorite(id)}
                      disabled={heartBusy}
                      className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-[12px] font-semibold ${
                        heartBusy
                          ? "cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-500"
                          : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      {heartBusy ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
