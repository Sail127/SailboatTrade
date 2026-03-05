// components/AdvancedSearchBar.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  "Sirius Yachts",
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
const TOP7_BUILDERS = [
  "Beneteau",
  "Jeanneau",
  "Lagoon",
  "Catalina",
  "Bavaria",
  "Fountaine Pajot",
  "Hanse",
];

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
  const popular = TOP7_BUILDERS.filter((m) => set.has(m));
  const rest = deduped.filter((m) => !popular.includes(m)).sort((a, b) => a.localeCompare(b));
  return { popular, rest };
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

function digitsOnly(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function formatPriceInput(value) {
  const digits = digitsOnly(value);
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
    priceMin: digitsOnly(initialValues?.priceMin),
    priceMax: digitsOnly(initialValues?.priceMax),
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
      className="ml-2 inline-flex h-5 min-w-[28px] items-center justify-center rounded-md border border-[#f3b23f]/90 bg-[#0a2230]/55 px-1.5 align-middle text-[11px] font-bold tracking-wide text-white leading-none hover:bg-[#12364a] hover:text-white"
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

  const { popular: popularBuilders, rest: otherBuilders } = useMemo(orderBuilders, []);
  const yearOptions = useMemo(buildYearOptions, []);
  const countryOptions = useMemo(buildCountryOptionsForSearch, []);
  const initial = useMemo(() => normalizeInitialValues(initialValues), [initialValues]);

  const [q, setQ] = useState(initial.q);
  const [type, setType] = useState(initial.type);
  const [builder, setBuilder] = useState(initial.builder);
  const [yearMin, setYearMin] = useState(initial.yearMin);
  const [yearMax, setYearMax] = useState(initial.yearMax);
  const [priceMin, setPriceMin] = useState(initial.priceMin);
  const [priceMax, setPriceMax] = useState(initial.priceMax);
  const [loaUnit, setLoaUnit] = useState(initial.loaUnit);
  const [loaMin, setLoaMin] = useState(initial.loaMin);
  const [loaMax, setLoaMax] = useState(initial.loaMax);
  const [country, setCountry] = useState(initial.country); // ✅ ISO alpha-2 or ""
  const [usRegion, setUsRegion] = useState(initial.usRegion);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [desktopHullMenuOpen, setDesktopHullMenuOpen] = useState(false);
  const desktopHullMenuRef = useRef(null);

  useEffect(() => {
    setQ(initial.q);
    setType(initial.type);
    setBuilder(initial.builder);
    setYearMin(initial.yearMin);
    setYearMax(initial.yearMax);
    setPriceMin(initial.priceMin);
    setPriceMax(initial.priceMax);
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
    initial.priceMin,
    initial.priceMax,
    initial.loaUnit,
    initial.loaMin,
    initial.loaMax,
    initial.country,
    initial.usRegion,
  ]);

  const isUSA = String(country || "").toUpperCase() === "US";
  const loaOptions = useMemo(() => buildLoaOptions(loaUnit), [loaUnit]);
  const activeFilterCount = useMemo(() => {
    const hasQuery = !!String(q || "").trim();
    const hasType = String(type || "both").toLowerCase() !== "both";
    const hasBuilder = !!String(builder || "").trim();
    const hasYearMin = !!String(yearMin || "").trim();
    const hasYearMax = !!String(yearMax || "").trim();
    const hasPriceMin = !!String(priceMin || "").trim();
    const hasPriceMax = !!String(priceMax || "").trim();
    const hasLoaMin = !!String(loaMin || "").trim();
    const hasLoaMax = !!String(loaMax || "").trim();
    const hasCountry = !!String(country || "").trim();
    const hasUsRegion = isUSA && !!String(usRegion || "").trim();

    let count = 0;
    if (hasQuery) count += 1;
    if (hasType) count += 1;
    if (hasBuilder) count += 1;
    if (hasYearMin || hasYearMax) count += 1;
    if (hasPriceMin || hasPriceMax) count += 1;
    if (hasLoaMin || hasLoaMax) count += 1;
    if (hasCountry) count += 1;
    if (hasUsRegion) count += 1;
    return count;
  }, [q, type, builder, yearMin, yearMax, priceMin, priceMax, loaMin, loaMax, country, isUSA, usRegion]);
  const hasActiveFilters = activeFilterCount > 0;

  useEffect(() => {
    if (!mobileDrawerOpen || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileDrawerOpen]);

  useEffect(() => {
    if (!mobileDrawerOpen || typeof window === "undefined") return;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileDrawerOpen]);

  useEffect(() => {
    if (!desktopHullMenuOpen || typeof document === "undefined") return;
    const onMouseDown = (e) => {
      if (desktopHullMenuRef.current && !desktopHullMenuRef.current.contains(e.target)) {
        setDesktopHullMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setDesktopHullMenuOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [desktopHullMenuOpen]);

  const shell = "w-full rounded-2xl bg-[#0a2230] px-4 pb-3 pt-1 shadow-lg ring-1 ring-white/15";

  const label = "block text-[12px] font-semibold tracking-wide text-white";

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
  const mobileDrawerLabel = "block text-[12px] font-bold tracking-wide text-white";
  const mobileDrawerSection = "space-y-2 border-t border-white/15 pt-3";

  const applyFilters = () => {
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
    put("priceMin", priceMin);
    put("priceMax", priceMax);

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

  const submit = (e) => {
    e.preventDefault();
    applyFilters();
  };

  const renderBuilderOptions = (keyPrefix) => (
    <>
      <option value="">All</option>
      {popularBuilders.map((b) => (
        <option key={`${keyPrefix}-popular-${b}`} value={b}>
          {b}
        </option>
      ))}
      <option value="" disabled>
        ──────────
      </option>
      {otherBuilders.map((b) => (
        <option key={`${keyPrefix}-other-${b}`} value={b}>
          {b}
        </option>
      ))}
      <option value="Other">Other</option>
    </>
  );

  const clearFilters = () => {
    setQ("");
    setType("both");
    setBuilder("");
    setYearMin("");
    setYearMax("");
    setPriceMin("");
    setPriceMax("");
    setLoaUnit("ft");
    setLoaMin("");
    setLoaMax("");
    setCountry("");
    setUsRegion("");
    router.push(submitPath);
  };

  return (
    <section className="w-full">
      <div className="lg:hidden pb-2">
        <div className="rounded-2xl bg-[#0a2230]/95 p-3 shadow-lg ring-1 ring-white/15 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-white">Advanced Search</p>
              <button
                type="button"
                onClick={clearFilters}
                disabled={!activeFilterCount}
                className="text-xs font-semibold text-white/80 underline underline-offset-2 hover:text-white disabled:opacity-40 disabled:no-underline"
              >
                Clear all filters
              </button>
            </div>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#f3b23f] px-4 text-sm font-bold text-[#0a2230] hover:bg-[#f9c860]"
            >
              <span>Open Filters</span>
              {activeFilterCount ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#0a2230] px-1.5 text-[11px] font-extrabold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      {mobileDrawerOpen ? (
        <div className="fixed inset-x-0 bottom-0 top-16 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Close advanced search panel"
            onClick={() => setMobileDrawerOpen(false)}
            className="absolute inset-0 bg-black/55"
          />

          <aside className="absolute right-0 top-0 h-full w-[min(92vw,390px)] overflow-y-auto bg-[#0a2230] p-4 shadow-2xl ring-1 ring-white/15">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-white">Advanced Search</h2>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="text-sm font-semibold text-white/85 underline underline-offset-2 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3 pb-24">
              <div className={mobileDrawerSection}>
                <label className={mobileDrawerLabel}>HULL TYPE</label>
                <div className="flex flex-wrap gap-2">
                  <HullTile active={type === "both"} onClick={() => setType("both")} label="All" isAll />
                  <HullTile active={type === "monohull"} onClick={() => setType("monohull")} label="Monohull" imgSrc="/images/hulls/monohull.png" />
                  <HullTile active={type === "catamaran"} onClick={() => setType("catamaran")} label="Catamaran" imgSrc="/images/hulls/catamaran.png" />
                  <HullTile active={type === "trimaran"} onClick={() => setType("trimaran")} label="Trimaran" imgSrc="/images/hulls/trimaran.png" />
                </div>
              </div>

              <div className={mobileDrawerSection}>
                <label className={mobileDrawerLabel}>KEYWORD SEARCH</label>
                <input
                  type="text"
                  placeholder="Search..."
                  className={input}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div className={mobileDrawerSection}>
                <label className={mobileDrawerLabel}>BUILDER</label>
                <select className={`${select} ${selectTextClass(builder)}`} value={builder} onChange={(e) => setBuilder(e.target.value)}>
                  {renderBuilderOptions("mobile-home-builder")}
                </select>
              </div>

              <div className={mobileDrawerSection}>
                <label className={mobileDrawerLabel}>YEAR</label>
                <div className="grid grid-cols-2 gap-2">
                  <select className={`${select} ${selectTextClass(yearMin)}`} value={yearMin} onChange={(e) => setYearMin(e.target.value)} aria-label="Minimum year">
                    <option value="">Min</option>
                    {yearOptions.map((y) => (
                      <option key={`mobile-home-year-min-${y}`} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <select className={`${select} ${selectTextClass(yearMax)}`} value={yearMax} onChange={(e) => setYearMax(e.target.value)} aria-label="Maximum year">
                    <option value="">Max</option>
                    {yearOptions.map((y) => (
                      <option key={`mobile-home-year-max-${y}`} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={mobileDrawerSection}>
                <div className="flex items-center justify-between gap-2">
                  <label className={mobileDrawerLabel}>Length</label>
                  <SmallUnitToggle value={loaUnit} onChange={setLoaUnit} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select className={`${select} ${selectTextClass(loaMin)}`} value={loaMin} onChange={(e) => setLoaMin(e.target.value)} aria-label={`Minimum LOA (${loaUnit})`}>
                    <option value="">Min</option>
                    {loaOptions.map((v) => (
                      <option key={`mobile-home-loa-min-${loaUnit}-${v}`} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <select className={`${select} ${selectTextClass(loaMax)}`} value={loaMax} onChange={(e) => setLoaMax(e.target.value)} aria-label={`Maximum LOA (${loaUnit})`}>
                    <option value="">Max</option>
                    {loaOptions.map((v) => (
                      <option key={`mobile-home-loa-max-${loaUnit}-${v}`} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={mobileDrawerSection}>
                <label className={mobileDrawerLabel}>PRICE</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Min"
                    className={input}
                    value={formatPriceInput(priceMin)}
                    onChange={(e) => setPriceMin(digitsOnly(e.target.value))}
                    aria-label="Minimum price"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Max"
                    className={input}
                    value={formatPriceInput(priceMax)}
                    onChange={(e) => setPriceMax(digitsOnly(e.target.value))}
                    aria-label="Maximum price"
                  />
                </div>
              </div>

              <div className={mobileDrawerSection}>
                <label className={mobileDrawerLabel}>{isUSA ? "COUNTRY / USA REGION" : "COUNTRY"}</label>

                {!isUSA ? (
                  <select
                    className={`${select} ${selectTextClass(country)}`}
                    value={country}
                    onChange={(e) => {
                      const next = String(e.target.value || "").toUpperCase();
                      setCountry(next);
                      if (next !== "US") setUsRegion("");
                    }}
                  >
                    {countryOptions.map((c) => (
                      <option key={`mobile-home-country-${c.value || "all"}`} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    <select
                      className={`${select} ${selectTextClass(country)}`}
                      value={country}
                      onChange={(e) => {
                        const next = String(e.target.value || "").toUpperCase();
                        setCountry(next);
                        if (next !== "US") setUsRegion("");
                      }}
                    >
                      {countryOptions.map((c) => (
                        <option key={`mobile-home-country-usa-${c.value || "all"}`} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className={`${select} ${selectTextClass(usRegion)}`}
                      value={usRegion}
                      onChange={(e) => setUsRegion(e.target.value)}
                      aria-label="USA Region"
                    >
                      {US_REGION_OPTIONS.map((o) => (
                        <option key={`mobile-home-us-region-${o.value || "all"}`} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-white/15 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    clearFilters();
                    setMobileDrawerOpen(false);
                  }}
                  className="text-[12px] font-semibold text-white/80 underline underline-offset-2 hover:text-white"
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="sticky bottom-0 -mx-4 border-t border-white/15 bg-[#0a2230]/95 px-4 py-3 backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  applyFilters();
                  setMobileDrawerOpen(false);
                }}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#f3b23f] px-6 text-sm font-extrabold text-[#0a2230] hover:bg-[#f9c860]"
                aria-label={hasActiveFilters ? "Apply selected filters" : "Browse all sailboats"}
              >
                {hasActiveFilters ? <FunnelIcon /> : <CompassIcon />}
                <span>{hasActiveFilters ? "Apply Filters" : "Browse All Sailboats"}</span>
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <form onSubmit={submit} className={`${shell} relative hidden lg:block`}>
        <div className="mx-auto w-full max-w-[900px]">
          {/* ROW 1 */}
          <div className="mt-0 grid grid-cols-[270px_120px_270px] items-end justify-center gap-3">
            <div className="min-w-0">
              <label htmlFor="home-keyword-search" className={label}>
                Keyword Search
              </label>
              <input
                id="home-keyword-search"
                type="text"
                placeholder="Keyword Search"
                className={`${input} mt-2 w-full`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="min-w-0" ref={desktopHullMenuRef}>
              <label className={`${label} text-center`}>Hull type</label>
              <div className="relative mt-2 flex justify-center">
                {type === "both" ? (
                  <HullTile
                    active
                    onClick={() => setDesktopHullMenuOpen((v) => !v)}
                    label="All"
                    isAll
                  />
                ) : type === "monohull" ? (
                  <HullTile
                    active
                    onClick={() => setDesktopHullMenuOpen((v) => !v)}
                    label="Monohull"
                    imgSrc="/images/hulls/monohull.png"
                  />
                ) : type === "catamaran" ? (
                  <HullTile
                    active
                    onClick={() => setDesktopHullMenuOpen((v) => !v)}
                    label="Catamaran"
                    imgSrc="/images/hulls/catamaran.png"
                  />
                ) : (
                  <HullTile
                    active
                    onClick={() => setDesktopHullMenuOpen((v) => !v)}
                    label="Trimaran"
                    imgSrc="/images/hulls/trimaran.png"
                  />
                )}
                {desktopHullMenuOpen ? (
                  <div className="absolute left-1/2 top-[calc(100%+8px)] z-20 -translate-x-1/2 rounded-xl border border-white/20 bg-[#0f2a3b]/98 p-2 shadow-xl">
                    <div className="flex items-center gap-2">
                      <HullTile
                        active={type === "both"}
                        onClick={() => {
                          setType("both");
                          setDesktopHullMenuOpen(false);
                        }}
                        label="All"
                        isAll
                      />
                      <HullTile
                        active={type === "monohull"}
                        onClick={() => {
                          setType("monohull");
                          setDesktopHullMenuOpen(false);
                        }}
                        label="Monohull"
                        imgSrc="/images/hulls/monohull.png"
                      />
                      <HullTile
                        active={type === "catamaran"}
                        onClick={() => {
                          setType("catamaran");
                          setDesktopHullMenuOpen(false);
                        }}
                        label="Catamaran"
                        imgSrc="/images/hulls/catamaran.png"
                      />
                      <HullTile
                        active={type === "trimaran"}
                        onClick={() => {
                          setType("trimaran");
                          setDesktopHullMenuOpen(false);
                        }}
                        label="Trimaran"
                        imgSrc="/images/hulls/trimaran.png"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="min-w-0">
              <div className="mb-0.5 text-right leading-none">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[12px] font-semibold text-white underline underline-offset-2 hover:text-white"
                >
                  Clear filters
                </button>
              </div>
              <label className={label}>Builder</label>
              <select
                className={`${select} mt-2 w-full ${selectTextClass(builder)}`}
                value={builder}
                onChange={(e) => setBuilder(e.target.value)}
                aria-label="Builder"
              >
                {renderBuilderOptions("desktop-home-builder")}
              </select>
            </div>
          </div>

          {/* ROW 2 */}
          <div className="mt-3 grid grid-cols-[220px_220px_220px] items-end justify-center gap-3">
            <div className="min-w-0">
              <label className={label}>Year</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  className={`${select} w-full ${selectTextClass(yearMin)}`}
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
                  className={`${select} w-full ${selectTextClass(yearMax)}`}
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

            <div className="min-w-0">
              <label className={label}>
                Length
                <SmallUnitToggle value={loaUnit} onChange={setLoaUnit} />
              </label>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  className={`${select} w-full ${selectTextClass(loaMin)}`}
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
                  className={`${select} w-full ${selectTextClass(loaMax)}`}
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

            <div className="min-w-0">
              <label className={label}>Price</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Min"
                  className={`${input} w-full`}
                  value={formatPriceInput(priceMin)}
                  onChange={(e) => setPriceMin(digitsOnly(e.target.value))}
                  aria-label="Minimum price"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Max"
                  className={`${input} w-full`}
                  value={formatPriceInput(priceMax)}
                  onChange={(e) => setPriceMax(digitsOnly(e.target.value))}
                  aria-label="Maximum price"
                />
              </div>
            </div>
          </div>

          {/* ROW 3 */}
          <div className="mt-3 grid grid-cols-[220px_220px_220px] items-end justify-center gap-3">
            <div className="min-w-0">
              <label className={label}>Country</label>
              <div className="mt-2">
                <select
                  className={`${select} w-full ${selectTextClass(country)}`}
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
                    className={`${select} w-full ${selectTextClass(usRegion)}`}
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
                  <div className="h-10" aria-hidden="true" />
                )}
              </div>
            </div>

            <div className="min-w-0">
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#f3b23f] px-4 text-sm font-semibold text-black hover:bg-[#f9c860] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3b23f]"
                aria-label={hasActiveFilters ? "Apply selected filters" : "Browse all sailboats"}
              >
                {hasActiveFilters ? <FunnelIcon /> : <CompassIcon />}
                <span>{hasActiveFilters ? "Apply Filters" : "Browse All Sailboats"}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
