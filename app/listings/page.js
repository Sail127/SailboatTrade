// app/listings/page.js
import prisma from "../../lib/prisma.js";
import ListingCard from "../../components/ListingCard.js";
import FilterSidebar from "../../components/FilterSidebar.js";
import SortSelect from "../../components/SortSelect.js";
import FiltersMobile from "../../components/FiltersMobile.js";
import ResultsPerPage from "../../components/ResultsPerPage.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PER_PAGE = 24;
const ALLOWED_PER_PAGE = [12, 18, 24, 36, 48];
const M_PER_FT = 0.3048; // 1 ft = 0.3048 m

const KNOWN_BUILDERS = [
  "Beneteau","Jeanneau","Lagoon","Catalina","Fountaine Pajot","Dufour","Bavaria",
  "Hunter","Hanse","X-Yachts","Oyster","Hallberg-Rassy","Island Packet","J/Boats",
  "Elan","Excess","Hylas","Leopard","Bali","Nautitech",
];

function toInt(v, fb = null) {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : fb;
}
function toFloat(v, fb = null) {
  const n = Number.parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fb;
}

async function resolveTypeValue(desired) {
  const HARD = {
    monohull: ["MONOHULL", "Monohull", "monohull"],
    catamaran: ["CATAMARAN", "Catamaran", "catamaran"],
    trimaran: ["TRIMARAN", "Trimaran", "trimaran"],
  }[desired] ?? [desired];

  const distinct = await prisma.listing.findMany({
    where: { status: "PUBLISHED" },
    select: { type: true },
    distinct: ["type"],
  });

  const values = distinct
    .map((r) => (r.type == null ? null : String(r.type)))
    .filter(Boolean);

  for (const v of HARD) if (values.includes(v)) return v;

  const re =
    desired === "monohull" ? /mono/i :
    desired === "catamaran" ? /cat/i :
    /tri/i;

  return values.find((v) => re.test(v)) ?? null;
}

export default async function Browse({ searchParams }) {
  const type = (searchParams?.type || "both").toString().toLowerCase();

  const builder =
    (searchParams?.builder ?? searchParams?.make ?? "")
      .toString()
      .trim();

  const country = searchParams?.country?.toString().trim() || "";

  const yearMin = toInt(searchParams?.yearMin);
  const yearMax = toInt(searchParams?.yearMax);

  const lengthUnit = (searchParams?.lengthUnit || "ft").toString().toLowerCase();
  const lengthMinRaw = toFloat(searchParams?.lengthMin);
  const lengthMaxRaw = toFloat(searchParams?.lengthMax);

  const lengthMin =
    lengthMinRaw == null ? null : (lengthUnit === "m" ? lengthMinRaw / M_PER_FT : lengthMinRaw);
  const lengthMax =
    lengthMaxRaw == null ? null : (lengthUnit === "m" ? lengthMaxRaw / M_PER_FT : lengthMaxRaw);

  const priceMin = toInt(searchParams?.priceMin);
  const priceMax = toInt(searchParams?.priceMax);

  const perPageParam = Number.parseInt(searchParams?.perPage ?? "", 10);
  const PAGE_SIZE = ALLOWED_PER_PAGE.includes(perPageParam) ? perPageParam : DEFAULT_PER_PAGE;
  const page = Math.max(1, toInt(searchParams?.page, 1));

  const currency = (searchParams?.currency || "USD").toString().toUpperCase();

  const where = { status: "PUBLISHED" };

  if (type !== "both") {
    const typeValue = await resolveTypeValue(type);
    if (typeValue) where.type = typeValue;
  }

  if (builder === "Other") {
    where.make = { notIn: KNOWN_BUILDERS };
  } else if (builder) {
    where.make = { equals: builder, mode: "insensitive" };
  }

  if (country) where.locationCountry = { equals: country, mode: "insensitive" };

  if (yearMin != null || yearMax != null) {
    where.year = {};
    if (yearMin != null) where.year.gte = yearMin;
    if (yearMax != null) where.year.lte = yearMax;
  }

  if (lengthMin != null || lengthMax != null) {
    where.length = {};
    if (lengthMin != null) where.length.gte = lengthMin;
    if (lengthMax != null) where.length.lte = lengthMax;
  }

  if (priceMin != null || priceMax != null) {
    where.price = {};
    if (priceMin != null) where.price.gte = priceMin;
    if (priceMax != null) where.price.lte = priceMax;
  }

  const countriesRaw = await prisma.listing.findMany({
    where: { status: "PUBLISHED" },
    select: { locationCountry: true },
    distinct: ["locationCountry"],
    orderBy: { locationCountry: "asc" },
  });
  const countries = countriesRaw.map((c) => c.locationCountry).filter(Boolean);

  const sort = (searchParams?.sort || "updated_desc").toString();
  const orderBy =
    {
      updated_desc: [{ updatedAt: "desc" }],
      updated_asc: [{ updatedAt: "asc" }],
      price_desc: [{ price: "desc" }, { updatedAt: "desc" }],
      price_asc: [{ price: "asc" }, { updatedAt: "desc" }],
      length_desc: [{ length: "desc" }, { updatedAt: "desc" }],
      length_asc: [{ length: "asc" }, { updatedAt: "desc" }],
      year_desc: [{ year: "desc" }, { updatedAt: "desc" }],
      year_asc: [{ year: "asc" }, { updatedAt: "desc" }],
      builder_asc: [{ make: "asc" }, { updatedAt: "desc" }],
      make_asc: [{ make: "asc" }, { updatedAt: "desc" }],
    }[sort] || [{ updatedAt: "desc" }];

  const total = await prisma.listing.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const skip = (page - 1) * PAGE_SIZE;

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
      make: true,
      model: true,
      length: true,
      locationCity: true,
      locationCountry: true,
      heroImageUrl: true,
    },
  });

  const listings = rows.map((l) => ({ ...l, priceCurrency: l.currency ?? "USD" }));

  const initial = {
    type,
    builder,
    country,
    yearMin: searchParams?.yearMin || "",
    yearMax: searchParams?.yearMax || "",
    lengthMin: searchParams?.lengthMin || "",
    lengthMax: searchParams?.lengthMax || "",
    lengthUnit,
    priceMin: searchParams?.priceMin || "",
    priceMax: searchParams?.priceMax || "",
    currency,
  };

  return (
    <main className="mx-auto max-w-7xl px-5 md:px-8 py-8">
      <h1 className="text-center text-3xl md:text-4xl font-semibold text-[#0a2230] mb-6">
        Your adventure awaits.
      </h1>

      {/* Top controls row (white page + navy text + small pills) */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="lg:hidden">
            <FiltersMobile initial={initial} countries={countries} />
          </div>
          <p className="text-sm font-semibold text-[#0a2230]">
            {total.toLocaleString()} results
          </p>
        </div>

        <div className="flex items-end gap-4">
          <SortSelect />
          <ResultsPerPage />
        </div>
      </div>

      <div className="lg:flex lg:gap-8">
        <aside className="hidden lg:block lg:w-72 flex-shrink-0">
          <FilterSidebar initial={initial} countries={countries} />
        </aside>

        <section className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>

          {totalPages > 1 && <Pager currentPage={page} totalPages={totalPages} />}
        </section>
      </div>
    </main>
  );
}

function Pager({ currentPage, totalPages }) {
  const qs = (p) => {
    if (typeof window === "undefined") return "#";
    const url = new URL(window.location.href);
    if (p <= 1) url.searchParams.delete("page");
    else url.searchParams.set("page", String(p));
    return url.pathname + "?" + url.searchParams.toString();
  };
  return (
    <nav className="mt-8 flex items-center justify-center gap-2">
      <a
        href={currentPage <= 1 ? "#" : qs(currentPage - 1)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium ring-1 ring-slate-300 text-[#0a2230] ${
          currentPage <= 1 ? "opacity-40 pointer-events-none" : "hover:bg-slate-50"
        }`}
      >
        ← Prev
      </a>
      <span className="px-2 py-1.5 text-slate-600">
        Page {currentPage} of {totalPages}
      </span>
      <a
        href={currentPage >= totalPages ? "#" : qs(currentPage + 1)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium ring-1 ring-slate-300 text-[#0a2230] ${
          currentPage >= totalPages ? "opacity-40 pointer-events-none" : "hover:bg-slate-50"
        }`}
      >
        Next →
      </a>
    </nav>
  );
}
