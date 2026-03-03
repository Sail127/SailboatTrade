// app/listings/page.js
import Link from "next/link";
import prisma from "../../lib/prisma.js";
import { readSession } from "../../lib/auth.js";
import ListingCard from "../../components/ListingCard.js";
import ListingsFilterSidebar from "../../components/ListingsFilterSidebar.js";
import SortSelect from "../../components/SortSelect.js";
import ResultsPerPage from "../../components/ResultsPerPage.js";
import { getCountryOptions } from "../../lib/countries.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PER_PAGE = 24;
const ALLOWED_PER_PAGE = [12, 18, 24, 36, 48];
const M_PER_FT = 0.3048; // 1 ft = 0.3048 m

const KNOWN_BUILDERS = [
  "Beneteau",
  "Jeanneau",
  "Lagoon",
  "Catalina",
  "Fountaine Pajot",
  "Dufour",
  "Bavaria",
  "Hunter",
  "Hanse",
  "X-Yachts",
  "Oyster",
  "Hallberg-Rassy",
  "Island Packet",
  "J/Boats",
  "Elan",
  "Excess",
  "Hylas",
  "Leopard",
  "Bali",
  "Nautitech",
];

// USA regions (UI label -> Prisma enum)
const US_REGION_MAP = {
  "West Coast": "WEST_COAST",
  "East Coast": "EAST_COAST",
  "Gulf Coast": "GULF_COAST",
  "Great Lakes": "GREAT_LAKES",
  "Other Inland waters": "OTHER_INLAND_WATERS",
  "Other Inland Waters": "OTHER_INLAND_WATERS",
};

const US_REGION_ENUMS = new Set([
  "WEST_COAST",
  "EAST_COAST",
  "GULF_COAST",
  "GREAT_LAKES",
  "OTHER_INLAND_WATERS",
]);

function toInt(v, fb = null) {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : fb;
}
function toFloat(v, fb = null) {
  const n = Number.parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fb;
}

const COUNTRY_OPTIONS = (getCountryOptions("en") || []).filter((o) => o?.value);
const COUNTRY_BY_CODE = new Map(COUNTRY_OPTIONS.map((o) => [String(o.value || "").toUpperCase(), o]));
const COUNTRY_BY_LABEL = new Map(COUNTRY_OPTIONS.map((o) => [String(o.label || "").toLowerCase(), o]));

function parseCountry(raw) {
  const input = String(raw ?? "").trim();
  if (!input) return { raw: "", code: "", label: "", variants: [] };

  const upper = input.toUpperCase();
  const lower = input.toLowerCase();
  const isUsAlias = ["usa", "us", "u.s.", "u.s.a.", "united states", "united states of america"].includes(lower);
  const byCode = COUNTRY_BY_CODE.get(upper);
  const byLabel = COUNTRY_BY_LABEL.get(lower);

  const country = byCode || byLabel || null;
  const code = country?.value ? String(country.value).toUpperCase() : "";
  const label = country?.label ? String(country.label).trim() : "";

  const variants = new Set([input, upper, label, code].filter(Boolean));
  if (code === "US" || isUsAlias) {
    variants.add("US");
    variants.add("USA");
    variants.add("United States");
    variants.add("United States of America");
  }

  return {
    raw: input,
    code: code || (upper === "US" || upper === "USA" || isUsAlias ? "US" : ""),
    label,
    variants: Array.from(variants),
  };
}

function parseUsRegion(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (US_REGION_MAP[s]) return US_REGION_MAP[s];
  const upper = s.toUpperCase();
  if (US_REGION_ENUMS.has(upper)) return upper;
  return "";
}

async function resolveTypeValue(desired) {
  const now = new Date();
  const publishedFilter = { status: "PUBLISHED", AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] };
  const HARD =
    {
      monohull: ["MONOHULL", "Monohull", "monohull"],
      catamaran: ["CATAMARAN", "Catamaran", "catamaran"],
      trimaran: ["TRIMARAN", "Trimaran", "trimaran"],
    }[desired] ?? [desired];

  const distinct = await prisma.listing.findMany({
    where: publishedFilter,
    select: { type: true },
    distinct: ["type"],
  });

  const values = distinct
    .map((r) => (r.type == null ? null : String(r.type)))
    .filter(Boolean);

  for (const v of HARD) if (values.includes(v)) return v;

  const re =
    desired === "monohull"
      ? /mono/i
      : desired === "catamaran"
      ? /cat/i
      : /tri/i;

  return values.find((v) => re.test(v)) ?? null;
}

// ✅ server-safe query builder (no window)
function buildHref(searchParams, pageNum) {
  const sp = new URLSearchParams();

  for (const [k, v] of Object.entries(searchParams ?? {})) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        const s = String(item ?? "").trim();
        if (s) sp.append(k, s);
      }
    } else {
      const s = String(v ?? "").trim();
      if (s) sp.set(k, s);
    }
  }

  if (pageNum <= 1) sp.delete("page");
  else sp.set("page", String(pageNum));

  const qs = sp.toString();
  return qs ? `/listings?${qs}` : "/listings";
}

export default async function Browse({ searchParams }) {
  const session = await readSession().catch(() => null);
  const viewerId = session?.uid ? String(session.uid) : "";

  const now = new Date();
  const publishedFilter = { status: "PUBLISHED", AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] };
  const q = (searchParams?.q ?? "").toString().trim();
  const type = (searchParams?.type || "both").toString().toLowerCase();

  const builder = (searchParams?.builder ?? "").toString().trim();

  const countryRaw = searchParams?.country?.toString().trim() || "";
  const country = parseCountry(countryRaw);

  const usRegionParam = searchParams?.usRegion ?? searchParams?.locationUsRegion ?? "";
  const usRegion = parseUsRegion(usRegionParam);

  const yearMin = toInt(searchParams?.yearMin);
  const yearMax = toInt(searchParams?.yearMax);
  const priceMin = toInt(searchParams?.priceMin);
  const priceMax = toInt(searchParams?.priceMax);

  const loaUnit = (searchParams?.loaUnit || "ft").toString().toLowerCase();
  const loaMinRaw = toFloat(searchParams?.loaMin);
  const loaMaxRaw = toFloat(searchParams?.loaMax);

  // DB stores LOA in feet
  const loaMin = loaMinRaw == null ? null : loaUnit === "m" ? loaMinRaw / M_PER_FT : loaMinRaw;
  const loaMax = loaMaxRaw == null ? null : loaUnit === "m" ? loaMaxRaw / M_PER_FT : loaMaxRaw;

  const perPageParam = Number.parseInt(searchParams?.perPage ?? "", 10);
  const PAGE_SIZE = ALLOWED_PER_PAGE.includes(perPageParam) ? perPageParam : DEFAULT_PER_PAGE;

  const page = Math.max(1, toInt(searchParams?.page, 1));

  const where = { ...publishedFilter, AND: [...(publishedFilter.AND || [])] };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { builder: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
      { locationCity: { contains: q, mode: "insensitive" } },
      { locationState: { contains: q, mode: "insensitive" } },
      { locationCountry: { contains: q, mode: "insensitive" } },
    ];
  }

  if (type !== "both") {
    const typeValue = await resolveTypeValue(type);
    if (typeValue) where.type = typeValue;
  }

  if (builder === "Other") {
    where.builder = { notIn: KNOWN_BUILDERS };
  } else if (builder) {
    where.builder = { equals: builder, mode: "insensitive" };
  }

  if (country.raw) {
    where.AND.push({
      OR: country.variants.map((v) => ({
        locationCountry: { equals: v, mode: "insensitive" },
      })),
    });

    if (country.code === "US" && usRegion) {
      where.locationUsRegion = usRegion;
    }
  }

  if (yearMin != null || yearMax != null) {
    where.year = {};
    if (yearMin != null) where.year.gte = yearMin;
    if (yearMax != null) where.year.lte = yearMax;
  }

  if (priceMin != null || priceMax != null) {
    where.price = {};
    if (priceMin != null) where.price.gte = priceMin;
    if (priceMax != null) where.price.lte = priceMax;
  }

  if (loaMin != null || loaMax != null) {
    where.loa = {};
    if (loaMin != null) where.loa.gte = loaMin;
    if (loaMax != null) where.loa.lte = loaMax;
  }

  const sort = (searchParams?.sort || "updated_desc").toString();
  const orderBy =
    {
      updated_desc: [{ updatedAt: "desc" }],
      updated_asc: [{ updatedAt: "asc" }],
      price_desc: [{ price: "desc" }, { updatedAt: "desc" }],
      price_asc: [{ price: "asc" }, { updatedAt: "desc" }],
      loa_desc: [{ loa: "desc" }, { updatedAt: "desc" }],
      loa_asc: [{ loa: "asc" }, { updatedAt: "desc" }],
      year_desc: [{ year: "desc" }, { updatedAt: "desc" }],
      year_asc: [{ year: "asc" }, { updatedAt: "desc" }],
      builder_asc: [{ builder: "asc" }, { updatedAt: "desc" }],
    }[sort] || [{ updatedAt: "desc" }];

  const total = await prisma.listing.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  // ✅ NEW schema-safe select (NO make/length)
  const rows = await prisma.listing.findMany({
    where,
    orderBy,
    skip,
    take: PAGE_SIZE,
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      year: true,
      builder: true, // ✅ replaces make
      model: true,
      loa: true, // ✅ replaces length
      loaUnit: true,
      locationCity: true,
      locationCountry: true,
      heroImageUrl: true,
      updatedAt: true,
    },
  });

  const rowIds = rows.map((r) => String(r.id || "")).filter(Boolean);
  let favoritedIds = new Set();

  if (viewerId && rowIds.length > 0) {
    const favs = await prisma.favorite.findMany({
      where: { userId: viewerId, listingId: { in: rowIds } },
      select: { listingId: true },
    });
    favoritedIds = new Set(favs.map((f) => String(f.listingId || "")));
  }

  // ✅ Compatibility mapping so older components expecting make/length don't crash
  const listings = rows.map((l) => ({
    ...l,
    priceCurrency: l.currency ?? "USD",
    make: l.builder ?? null, // legacy (ListingCard or others might still use)
    length: l.loa ?? null, // legacy
    lengthUnit: l.loaUnit ?? null, // legacy
    viewerFavorited: favoritedIds.has(String(l.id || "")),
    viewerLoggedIn: Boolean(viewerId),
  }));

  const initial = {
    q,
    type,
    builder,
    country: country.code || "",
    usRegion,
    yearMin: searchParams?.yearMin || "",
    yearMax: searchParams?.yearMax || "",
    priceMin: searchParams?.priceMin || "",
    priceMax: searchParams?.priceMax || "",
    loaMin: searchParams?.loaMin || "",
    loaMax: searchParams?.loaMax || "",
    loaUnit,
    sort,
  };

  return (
    <main className="mx-auto max-w-[82rem] px-5 md:px-8 py-8">
      <h1 className="text-center text-3xl md:text-4xl font-semibold text-[#0a2230] mb-6">
        Your adventure awaits.
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[221px_minmax(0,1fr)] gap-4 items-start">
        <div className="lg:sticky lg:top-24 self-start">
          <ListingsFilterSidebar initialValues={initial} submitPath="/listings" />
        </div>

        <section>
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-[#0a2230]">
                  {total.toLocaleString()} results
                </p>
                {q && (
                  <p className="text-xs text-slate-600">
                    Search: <span className="font-semibold text-[#0a2230]">{q}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-end gap-4">
              <SortSelect />
              <ResultsPerPage />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} imageFit="contain" showFavorite />
            ))}
          </div>

          {totalPages > 1 && (
            <Pager
              currentPage={safePage}
              totalPages={totalPages}
              searchParams={searchParams}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function Pager({ currentPage, totalPages, searchParams }) {
  const prevHref = buildHref(searchParams, currentPage - 1);
  const nextHref = buildHref(searchParams, currentPage + 1);

  const disabledPrev = currentPage <= 1;
  const disabledNext = currentPage >= totalPages;

  const base =
    "px-3 py-1.5 rounded-lg text-sm font-medium ring-1 ring-slate-300 text-[#0a2230]";

  return (
    <nav className="mt-8 flex items-center justify-center gap-2">
      {disabledPrev ? (
        <span className={`${base} opacity-40 pointer-events-none`}>← Prev</span>
      ) : (
        <Link href={prevHref} className={`${base} hover:bg-slate-50`}>
          ← Prev
        </Link>
      )}

      <span className="px-2 py-1.5 text-slate-600">
        Page {currentPage} of {totalPages}
      </span>

      {disabledNext ? (
        <span className={`${base} opacity-40 pointer-events-none`}>Next →</span>
      ) : (
        <Link href={nextHref} className={`${base} hover:bg-slate-50`}>
          Next →
        </Link>
      )}
    </nav>
  );
}
