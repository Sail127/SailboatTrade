// components/AdvancedSearchBar.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCountryOptions } from "@/lib/countries";

const RAW_BUILDERS = [
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
const TOP5 = ["Beneteau", "Jeanneau", "Lagoon", "Catalina", "Bavaria"];

// ✅ Match your listing form enum values (and add an "All" option for search)
const US_REGION_OPTIONS = [
  { label: "All USA regions", value: "" },
  { label: "West Coast", value: "WEST_COAST" },
  { label: "East Coast", value: "EAST_COAST" },
  { label: "Gulf Coast", value: "GULF_COAST" },
  { label: "Great Lakes", value: "GREAT_LAKES" },
  { label: "Hawaii", value: "HAWAII" },
  { label: "Other Inland waters", value: "OTHER_INLAND_WATERS" },
  { label: "Other U.S. Territorial waters", value: "OTHER_US_TERRITORIAL" },
];

function orderBuilders() {
  const set = new Set(RAW_BUILDERS.map((m) => m.trim()).filter(Boolean));
  const deduped = Array.from(set);
  const rest = deduped.filter((m) => !TOP5.includes(m)).sort((a, b) => a.localeCompare(b));
  return [...TOP5, ...rest];
}

function buildYearOptions() {
  const nowYear = new Date().getFullYear();
  const max = nowYear + 1;
  const min = 1950;
  const out = [];
  for (let y = max; y >= min; y--) out.push(String(y));
  return out;
}

function buildCountryOptionsForSearch() {
  // getCountryOptions() already includes { value:"", label:"Select…" } at top.
  const opts = getCountryOptions("en") || [];
  const rest = opts.filter((o) => o?.value); // remove the blank Select…
  return [{ value: "", label: "All" }, ...rest];
}

function buildLoaOptions(unit) {
  if (unit === "m") {
    const out = [];
    for (let v = 3; v <= 35; v += 1) out.push(String(v));
    return out;
  }
  const out = [];
  for (let v = 10; v <= 100; v += 1) out.push(String(v));
  return out;
}

function CompassIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2.3 5.3-5.3 2.3 2.3-5.3z" />
    </svg>
  );
}

function FunnelIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 5h18l-7 8v5l-4 2v-7z" />
    </svg>
  );
}

function normalizeInitialValues(initialValues = {}) {
  const nextType = String(initialValues?.type || "both").toLowerCase();
  const safeType = ["both", "monohull", "catamaran", "trimaran"].includes(nextType) ? nextType : "both";

  const nextLoaUnit = String(initialValues?.loaUnit || "ft").toLowerCase();
  const safeLoaUnit = nextLoaUnit === "m" ? "m" : "ft";

  return {
    q: String(initialValues?.q || ""),
    type: safeType,
    builder: String(initialValues?.builder || ""),
    yearMin: String(initialValues?.yearMin || ""),
    yearMax: String(initialValues?.yearMax || ""),
    loaUnit: safeLoaUnit,
    loaMin: String(initialValues?.loaMin || ""),
    loaMax: String(initialValues?.loaMax || ""),
    country: String(initialValues?.country || "").toUpperCase(),
    usRegion: String(initialValues?.usRegion || ""),
  };
}

/** Small inline FT/M toggle */
function SmallUnitToggle({ value, onChange }) {
  const nextValue = value === "ft" ? "m" : "ft";
  return (
    <button
      type="button"
      onClick={() => onChange(nextValue)}
      className="ml-2 inline -translate-y-[1px] align-middle text-[12px] font-semibold text-[#f3b23f] underline underline-offset-2 hover:text-[#f9c860]"
      aria-label={`Switch LOA unit to ${nextValue.toUpperCase()}`}
      title={`Switch to ${nextValue.toUpperCase()}`}
    >
      {value.toUpperCase()}
    </button>
  );
}

function HullTile({ active, onClick, label, imgSrc, isAll = false }) {
  const tileW = "w-[66px]";
  const tileH = "h-[56px]";
  const base =
    `relative ${tileW} ${tileH} rounded-xl border ` +
    "flex flex-col items-center justify-center transition";

  const skin = active
    ? "bg-white/10 border-white/25"
    : "bg-white/5 border-white/12 hover:bg-white/10 hover:border-white/20";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[base, skin].join(" ")}
      aria-pressed={active}
      title={label}
    >
      <span
        className={[
          "absolute left-2 right-2 bottom-1 h-[2px] rounded-full transition",
          active ? "bg-[#f3b23f] opacity-100" : "bg-transparent opacity-0",
        ].join(" ")}
        aria-hidden="true"
      />

      {isAll ? (
        <div className="h-full w-full flex items-center justify-center">
          <span className="text-white font-extrabold tracking-wide text-[13px] leading-none">ALL</span>
        </div>
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt=""
            draggable={false}
            className="w-[88%] h-[28px] object-contain opacity-95"
          />
          <span className="mt-1 text-[10px] font-semibold text-white/80 leading-none">{label}</span>
        </div>
      )}
    </button>
  );
}

export default function AdvancedSearchBar({ variant = "dark", submitPath = "/listings", initialValues = {} }) {
  const router = useRouter();

  const builders = useMemo(orderBuilders, []);
  const yearOptions = useMemo(buildYearOptions, []);
  const countryOptions = useMemo(buildCountryOptionsForSearch, []);
  const initial = useMemo(() => normalizeInitialValues(initialValues), [initialValues]);

  const [q, setQ] = useState(initial.q);
  const [type, setType] = useState(initial.type);
  const [builder, setBuilder] = useState(initial.builder);
  const [yearMin, setYearMin] = useState(initial.yearMin);
  const [yearMax, setYearMax] = useState(initial.yearMax);
  const [loaUnit, setLoaUnit] = useState(initial.loaUnit);
  const [loaMin, setLoaMin] = useState(initial.loaMin);
  const [loaMax, setLoaMax] = useState(initial.loaMax);
  const [country, setCountry] = useState(initial.country); // ✅ ISO alpha-2 or ""
  const [usRegion, setUsRegion] = useState(initial.usRegion);

  useEffect(() => {
    setQ(initial.q);
    setType(initial.type);
    setBuilder(initial.builder);
    setYearMin(initial.yearMin);
    setYearMax(initial.yearMax);
    setLoaUnit(initial.loaUnit);
    setLoaMin(initial.loaMin);
    setLoaMax(initial.loaMax);
    setCountry(initial.country);
    setUsRegion(initial.usRegion);
  }, [
    initial.q,
    initial.type,
    initial.builder,
    initial.yearMin,
    initial.yearMax,
    initial.loaUnit,
    initial.loaMin,
    initial.loaMax,
    initial.country,
    initial.usRegion,
  ]);

  const isUSA = String(country || "").toUpperCase() === "US";
  const loaOptions = useMemo(() => buildLoaOptions(loaUnit), [loaUnit]);
  const hasActiveFilters = useMemo(() => {
    const hasQuery = !!String(q || "").trim();
    const hasType = String(type || "both").toLowerCase() !== "both";
    const hasBuilder = !!String(builder || "").trim();
    const hasYearMin = !!String(yearMin || "").trim();
    const hasYearMax = !!String(yearMax || "").trim();
    const hasLoaMin = !!String(loaMin || "").trim();
    const hasLoaMax = !!String(loaMax || "").trim();
    const hasCountry = !!String(country || "").trim();
    const hasUsRegion = isUSA && !!String(usRegion || "").trim();

    return (
      hasQuery ||
      hasType ||
      hasBuilder ||
      hasYearMin ||
      hasYearMax ||
      hasLoaMin ||
      hasLoaMax ||
      hasCountry ||
      hasUsRegion
    );
  }, [q, type, builder, yearMin, yearMax, loaMin, loaMax, country, isUSA, usRegion]);

  const shell = "w-full rounded-2xl bg-[#0a2230] p-4 shadow-lg ring-1 ring-white/15";

  const label = "block text-[12px] font-semibold tracking-wide text-white/80";

  // ✅ Force white inputs regardless of globals.css
  const input =
    "h-10 w-full rounded-full border border-white/20 px-3 text-sm outline-none [color-scheme:light] " +
    "!bg-white !text-[#0a2230] placeholder:!text-slate-400 " +
    "focus:border-[#f3b23f]/60 focus:ring-2 focus:ring-[#f3b23f]/30";

  const select =
    "h-10 w-full rounded-full border border-white/20 px-3 text-sm outline-none [color-scheme:light] " +
    "!bg-white !text-[#0a2230] " +
    "focus:border-[#f3b23f]/60 focus:ring-2 focus:ring-[#f3b23f]/30";

  const selectTextClass = (value) =>
    String(value || "").trim() ? "!text-[#0a2230]" : "!text-slate-400";

  const button =
    "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#f3b23f] px-6 text-sm font-semibold text-black " +
    "hover:bg-[#f9c860] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3b23f]";

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();

    const put = (k, v) => {
      const s = String(v ?? "").trim();
      if (s) params.set(k, s);
    };

    put("q", q);
    if (type && type !== "both") put("type", type);

    put("builder", builder);

    put("yearMin", yearMin);
    put("yearMax", yearMax);

    const hasLoaRange = String(loaMin || "").trim() || String(loaMax || "").trim();
    if (hasLoaRange) {
      put("loaUnit", loaUnit);
      put("loaMin", loaMin);
      put("loaMax", loaMax);
    }

    // ✅ Country is ISO alpha-2 (matches your listing form + DB)
    if (country) params.set("country", String(country).toUpperCase());
    else params.delete("country");

    // ✅ Only allow usRegion when country is US
    if (isUSA) put("usRegion", usRegion);
    else params.delete("usRegion");

    params.delete("page");

    const qs = params.toString();
    router.push(qs ? `${submitPath}?${qs}` : submitPath);
  };

  const clearFilters = () => {
    setQ("");
    setType("both");
    setBuilder("");
    setYearMin("");
    setYearMax("");
    setLoaUnit("ft");
    setLoaMin("");
    setLoaMax("");
    setCountry("");
    setUsRegion("");
    router.push(submitPath);
  };

  return (
    <section className="w-full">
      <form onSubmit={submit} className={`${shell} relative`}>
        <button
          type="button"
          onClick={clearFilters}
          className="lg:hidden absolute right-4 top-4 text-[12px] font-semibold text-white/90 underline underline-offset-2 hover:text-white"
        >
          Clear filters
        </button>

        {/* ROW 1: Hull type + Keyword search (left), Clear (right) */}
        <div className="grid grid-cols-12 gap-3 items-start">
          <div className="col-span-12 lg:col-span-10 min-w-0">
            <div className={label}>Hull type</div>
            <div className="mt-1.5 flex flex-wrap xl:flex-nowrap items-center gap-2">
              <HullTile active={type === "both"} onClick={() => setType("both")} label="All" isAll />
              <HullTile
                active={type === "monohull"}
                onClick={() => setType("monohull")}
                label="Monohull"
                imgSrc="/images/hulls/monohull.png"
              />
              <HullTile
                active={type === "catamaran"}
                onClick={() => setType("catamaran")}
                label="Catamaran"
                imgSrc="/images/hulls/catamaran.png"
              />
              <HullTile
                active={type === "trimaran"}
                onClick={() => setType("trimaran")}
                label="Trimaran"
                imgSrc="/images/hulls/trimaran.png"
              />

              <div className="basis-full xl:basis-auto w-full mt-2 xl:mt-0 xl:w-auto xl:ml-5 shrink-0">
                <label htmlFor="home-keyword-search" className="sr-only">
                  Keyword search
                </label>
                <input
                  id="home-keyword-search"
                  type="text"
                  placeholder="Keyword Search"
                  className={`${input} max-w-[380px] xl:w-[33ch] xl:max-w-[33ch]`}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-2 min-w-0 lg:pt-[18px]">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="text-[12px] font-semibold text-white/90 underline underline-offset-2 hover:text-white"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: Year + Builder + LOA */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[252px_360px_252px] lg:items-start">
          <div className="min-w-0">
            <label className={label}>Year</label>
            <div className="mt-2 flex gap-2">
              <select
                className={`${select} !w-[120px] ${selectTextClass(yearMin)}`}
                value={yearMin}
                onChange={(e) => setYearMin(e.target.value)}
                aria-label="Minimum year"
              >
                <option value="">Min</option>
                {yearOptions.map((y) => (
                  <option key={`year-min-${y}`} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                className={`${select} !w-[120px] ${selectTextClass(yearMax)}`}
                value={yearMax}
                onChange={(e) => setYearMax(e.target.value)}
                aria-label="Maximum year"
              >
                <option value="">Max</option>
                {yearOptions.map((y) => (
                  <option key={`year-max-${y}`} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-w-0 lg:w-[360px]">
            <label className={label}>Builder</label>
            <select
              className={`${select} mt-2 w-full max-w-[380px] lg:max-w-none ${selectTextClass(builder)}`}
              value={builder}
              onChange={(e) => setBuilder(e.target.value)}
            >
              <option value="">All</option>
              {builders.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className={label}>
              LOA <span className="text-white/55 font-semibold">(length overall)</span>
              <SmallUnitToggle value={loaUnit} onChange={setLoaUnit} />
            </label>

            <div className="mt-2 lg:mt-1 flex gap-2">
              <select
                className={`${select} !w-[120px] ${selectTextClass(loaMin)}`}
                value={loaMin}
                onChange={(e) => setLoaMin(e.target.value)}
                aria-label={`Minimum LOA (${loaUnit})`}
              >
                <option value="">{loaUnit.toUpperCase()} Min</option>
                {loaOptions.map((v) => (
                  <option key={`loa-min-${loaUnit}-${v}`} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                className={`${select} !w-[120px] ${selectTextClass(loaMax)}`}
                value={loaMax}
                onChange={(e) => setLoaMax(e.target.value)}
                aria-label={`Maximum LOA (${loaUnit})`}
              >
                <option value="">{loaUnit.toUpperCase()} Max</option>
                {loaOptions.map((v) => (
                  <option key={`loa-max-${loaUnit}-${v}`} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ROW 3: Country + Region slot + Search */}
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_280px] lg:gap-2">
            <div className="min-w-0">
            <label className={label}>Country</label>

            <div className="mt-2">
              <select
                className={`${select} w-full max-w-[380px] lg:max-w-none ${selectTextClass(country)}`}
                value={country}
                onChange={(e) => {
                  const next = String(e.target.value || "").toUpperCase();
                  setCountry(next);
                  if (next !== "US") setUsRegion("");
                }}
              >
                {countryOptions.map((c) => (
                  <option key={c.value || "all"} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            </div>

            <div className="min-w-0">
            <label className={label}>
              {isUSA ? "USA Region" : <span className="invisible">USA Region</span>}
            </label>
            <div className="mt-2">
              {isUSA ? (
                <select
                  className={`${select} w-full max-w-[380px] lg:max-w-none ${selectTextClass(usRegion)}`}
                  value={usRegion}
                  onChange={(e) => setUsRegion(e.target.value)}
                  aria-label="USA Region"
                >
                  {US_REGION_OPTIONS.map((o) => (
                    <option key={o.value || "all"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="hidden h-10 lg:block" aria-hidden="true" />
              )}
            </div>
            </div>
          </div>

          <div className="lg:ml-auto lg:pl-4">
            <button
              type="submit"
              className={`${button} mt-2 w-full max-w-[380px] lg:mt-0 lg:w-auto lg:min-w-[220px]`}
              aria-label={hasActiveFilters ? "Apply selected filters" : "Browse all sailboats"}
            >
              {hasActiveFilters ? <FunnelIcon /> : <CompassIcon />}
              <span>{hasActiveFilters ? "Apply Filters" : "Browse All Sailboats"}</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
