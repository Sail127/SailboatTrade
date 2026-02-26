// components/ListingCard.js
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

export default function ListingCard({ listing, variant = "default" }) {
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
  } = listing || {};

  const displayTitle = [builder, model].filter(Boolean).join(" ") || title || "Untitled";
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
          className={`${
            isFeatured ? "object-contain object-center p-2 bg-slate-100" : "object-cover object-center"
          } transition-transform duration-300 group-hover:scale-105`}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          unoptimized={isUnoptimized}
        />

        {!isFeatured ? (
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
        ) : null}

        {!isFeatured ? (
          <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-[#0a2230] shadow-sm">
            {priceText}
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <h3 className="text-[15px] font-semibold text-slate-900 group-hover:text-[#0a2230] line-clamp-1">
          {isFeatured ? [year, builder, model].filter(Boolean).join(" ") || displayTitle : displayTitle}
        </h3>

        <div className="mt-2 flex flex-wrap gap-2">
          {year ? <Pill>{year}</Pill> : null}
          {loa != null ? <Pill>{loa} {loaUnit || "ft"}</Pill> : null}
          {hull ? <Pill>{hull}</Pill> : null}
          {cabins != null ? <Pill>{cabins} cabins</Pill> : null}
          {heads != null ? <Pill>{heads} heads</Pill> : null}
        </div>

        {loc ? (
          <div className="mt-3 flex items-center gap-1.5 text-[12px] text-slate-500">
            <span className="text-slate-400"><PinIcon /></span>
            <span className="line-clamp-1">{loc}</span>
          </div>
        ) : (
          <div className="mt-3 text-[12px] text-slate-400"> </div>
        )}
      </div>
    </Link>
  );
}
