"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCountryOptions } from "@/lib/countries";
import { getBuilderGroups } from "@/lib/builders";

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

function buildYearOptions() {
  const nowYear = new Date().getFullYear();
  const max = nowYear + 1;
  const min = 1950;
  const out = [];
  for (let y = max; y >= min; y--) out.push(String(y));
  return out;
}

function buildCountryOptionsForSearch() {
  const opts = getCountryOptions("en") || [];
  const rest = opts.filter((o) => o?.value);
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

function normalizeMultiSelectValues(value, { upper = false } = {}) {
  const arr = Array.isArray(value) ? value : value == null ? [] : [value];
  const out = [];
  const seen = new Set();

  for (const item of arr) {
    const trimmed = String(item ?? "").trim();
    if (!trimmed) continue;
    const normalized = upper ? trimmed.toUpperCase() : trimmed;
    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(normalized);
  }

  return out;
}

function addUniqueValue(values, nextValue, { upper = false } = {}) {
  const next = String(nextValue ?? "").trim();
  if (!next) return values;
  const normalized = upper ? next.toUpperCase() : next;
  const targetKey = normalized.toLowerCase();
  const exists = values.some((v) => String(v || "").toLowerCase() === targetKey);
  if (exists) return values;
  return [...values, normalized];
}

function removeValue(values, targetValue) {
  const targetKey = String(targetValue ?? "").trim().toLowerCase();
  if (!targetKey) return values;
  return values.filter((v) => String(v || "").toLowerCase() !== targetKey);
}

function normalizeInitialValues(initialValues = {}) {
  const nextType = String(initialValues?.type || "both").toLowerCase();
  const safeType = ["both", "monohull", "catamaran", "trimaran"].includes(nextType) ? nextType : "both";

  const nextLoaUnit = String(initialValues?.loaUnit || "ft").toLowerCase();
  const safeLoaUnit = nextLoaUnit === "m" ? "m" : "ft";

  return {
    q: String(initialValues?.q || ""),
    type: safeType,
    builder: normalizeMultiSelectValues(initialValues?.builder),
    yearMin: String(initialValues?.yearMin || ""),
    yearMax: String(initialValues?.yearMax || ""),
    priceMin: digitsOnly(initialValues?.priceMin),
    priceMax: digitsOnly(initialValues?.priceMax),
    loaUnit: safeLoaUnit,
    loaMin: String(initialValues?.loaMin || ""),
    loaMax: String(initialValues?.loaMax || ""),
    country: normalizeMultiSelectValues(initialValues?.country, { upper: true }),
    usRegion: String(initialValues?.usRegion || ""),
  };
}

function SmallUnitToggle({ value, onChange }) {
  const btn =
    "px-1.5 py-0.5 rounded-md text-[11px] font-bold border transition " +
    "bg-white text-[#0a2230] border-slate-300 hover:bg-slate-50";

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange("ft")}
        className={[btn, value === "ft" ? "ring-2 ring-[#f3b23f]/70 border-[#f3b23f]/70" : ""].join(" ")}
        aria-pressed={value === "ft"}
      >
        FT
      </button>
      <button
        type="button"
        onClick={() => onChange("m")}
        className={[btn, value === "m" ? "ring-2 ring-[#f3b23f]/70 border-[#f3b23f]/70" : ""].join(" ")}
        aria-pressed={value === "m"}
      >
        M
      </button>
    </span>
  );
}

function Pill({ children, onClick = null }) {
  const interactive = typeof onClick === "function";

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 rounded-full bg-[#374047] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#2f373d]"
        title="Remove this filter"
      >
        <span aria-hidden="true" className="text-[16px] leading-none -mt-[1px]">
          ×
        </span>
        {children}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-[#374047] px-2.5 py-1 text-[10px] font-bold text-white">
      {children}
    </span>
  );
}

function HullButton({ active, onClick, label, imgSrc, isAll = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={[
        "relative inline-flex h-12 w-16 items-center justify-center rounded-xl border transition overflow-hidden",
        active
          ? "bg-[#0a2230] text-white border-[#0a2230]"
          : "bg-[#0a2230] text-white border-white/20 hover:border-white/40",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none absolute left-2 right-2 bottom-1 h-[2px] rounded-full transition",
          active ? "bg-[#f3b23f]" : "bg-transparent",
        ].join(" ")}
        aria-hidden="true"
      />
      {isAll ? (
        <span className="text-[11px] font-extrabold tracking-wide">ALL</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgSrc} alt="" draggable={false} className="h-full w-full object-contain" />
      )}
    </button>
  );
}

export default function ListingsFilterSidebar({ submitPath = "/listings", initialValues = {} }) {
  const router = useRouter();

  const { popular: popularBuilders, rest: otherBuilders } = useMemo(getBuilderGroups, []);
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
  const [country, setCountry] = useState(initial.country);
  const [usRegion, setUsRegion] = useState(initial.usRegion);
  const [saveMsg, setSaveMsg] = useState("");
  const [showHullPicker, setShowHullPicker] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const readyRef = useRef(false);
  const syncingRef = useRef(false);
  const applyTimerRef = useRef(null);

  useEffect(() => {
    syncingRef.current = true;
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

    const t = setTimeout(() => {
      syncingRef.current = false;
      readyRef.current = true;
    }, 0);

    return () => clearTimeout(t);
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

  const isUSA = country.includes("US");
  const loaOptions = useMemo(() => buildLoaOptions(loaUnit), [loaUnit]);
  const countryOptionsNoBlank = useMemo(() => countryOptions.filter((c) => c?.value), [countryOptions]);
  const countryLabelByCode = useMemo(() => {
    const map = new Map();
    for (const c of countryOptions) {
      if (!c?.value) continue;
      map.set(String(c.value).toUpperCase(), String(c.label || "").trim());
    }
    return map;
  }, [countryOptions]);

  const activeFilterPills = useMemo(() => {
    const items = [];
    if (type && type !== "both") {
      items.push({
        id: "type",
        label: type[0].toUpperCase() + type.slice(1),
        onRemove: () => {
          setType("both");
          setShowHullPicker(false);
        },
      });
    }
    for (const selectedBuilder of builder) {
      items.push({
        id: `builder-${selectedBuilder}`,
        label: selectedBuilder,
        onRemove: () => setBuilder((prev) => removeValue(prev, selectedBuilder)),
      });
    }
    if (yearMin || yearMax) {
      items.push({
        id: "year",
        label: `Year ${yearMin || "Any"}-${yearMax || "Any"}`,
        onRemove: () => {
          setYearMin("");
          setYearMax("");
        },
      });
    }
    if (priceMin || priceMax) {
      items.push({
        id: "price",
        label: `Price ${formatPriceInput(priceMin) || "Any"}-${formatPriceInput(priceMax) || "Any"}`,
        onRemove: () => {
          setPriceMin("");
          setPriceMax("");
        },
      });
    }
    if (loaMin || loaMax) {
      items.push({
        id: "loa",
        label: `LOA ${loaMin || "Any"}-${loaMax || "Any"} ${loaUnit}`,
        onRemove: () => {
          setLoaMin("");
          setLoaMax("");
        },
      });
    }
    for (const selectedCountry of country) {
      items.push({
        id: `country-${selectedCountry}`,
        label: countryLabelByCode.get(selectedCountry) || selectedCountry,
        onRemove: () => {
          setCountry((prev) => {
            const next = removeValue(prev, selectedCountry);
            if (!next.includes("US")) setUsRegion("");
            return next;
          });
        },
      });
    }
    if (isUSA && usRegion) {
      items.push({
        id: "usRegion",
        label: usRegion.replaceAll("_", " "),
        onRemove: () => setUsRegion(""),
      });
    }
    if (q) {
      items.push({
        id: "q",
        label: `"${q}"`,
        onRemove: () => setQ(""),
      });
    }
    return items;
  }, [type, builder, yearMin, yearMax, priceMin, priceMax, loaMin, loaMax, loaUnit, country, countryLabelByCode, isUSA, usRegion, q]);

  const input =
    "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-[#0a2230] " +
    "placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-[#c8a44d]/35";

  const select =
    "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-[#0a2230] " +
    "outline-none focus:ring-2 focus:ring-[#c8a44d]/35";

  const selectTextClass = (value) =>
    Array.isArray(value)
      ? value.length
        ? "text-[#0a2230]"
        : "text-slate-500"
      : String(value || "").trim()
      ? "text-[#0a2230]"
      : "text-slate-500";

  const drawerLabel = "block text-[12px] font-bold tracking-wide text-white/95";
  const drawerSection = "space-y-2 border-t border-white/15 pt-3";
  const drawerInput =
    "h-10 w-full rounded-full border border-white/20 px-3 text-sm outline-none [color-scheme:light] " +
    "!bg-white !text-[#0a2230] placeholder:!text-slate-500 focus:border-[#f3b23f]/60 focus:ring-2 focus:ring-[#f3b23f]/30";
  const drawerSelect =
    "h-10 w-full rounded-full border border-white/20 px-3 text-sm outline-none [color-scheme:light] " +
    "!bg-white !text-[#0a2230] focus:border-[#f3b23f]/60 focus:ring-2 focus:ring-[#f3b23f]/30";
  const drawerSelectTextClass = (value) =>
    Array.isArray(value)
      ? value.length
        ? "!text-[#0a2230]"
        : "!text-slate-500"
      : String(value || "").trim()
      ? "!text-[#0a2230]"
      : "!text-slate-500";
  const pickerRowClass = (active) =>
    [
      "w-full rounded-md px-2 py-1.5 text-left text-[13px] transition",
      active ? "bg-[#0a2230] text-white font-semibold" : "text-[#0a2230] hover:bg-slate-50",
    ].join(" ");

  function buildParams() {
    const params = new URLSearchParams();
    const put = (k, v) => {
      const s = String(v ?? "").trim();
      if (s) params.set(k, s);
    };

    put("q", q);
    if (type && type !== "both") put("type", type);
    for (const selectedBuilder of builder) params.append("builder", selectedBuilder);
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

    for (const selectedCountry of country) params.append("country", String(selectedCountry).toUpperCase());
    if (isUSA) put("usRegion", usRegion);
    params.delete("page");
    return params;
  }

  function clearFilters() {
    setQ("");
    setType("both");
    setBuilder([]);
    setYearMin("");
    setYearMax("");
    setPriceMin("");
    setPriceMax("");
    setLoaUnit("ft");
    setLoaMin("");
    setLoaMax("");
    setCountry([]);
    setUsRegion("");
    setShowHullPicker(false);
    router.push(submitPath);
  }

  function applyNow() {
    const params = buildParams();
    const qs = params.toString();
    router.push(qs ? `${submitPath}?${qs}` : submitPath);
  }

  function toggleHullPicker() {
    setShowHullPicker((v) => !v);
  }

  function chooseHull(nextType) {
    setType(nextType);
    setShowHullPicker(false);
  }

  function handleBuilderToggle(value) {
    const next = String(value || "").trim();
    if (!next) return;
    setBuilder((prev) => {
      const key = next.toLowerCase();
      const exists = prev.some((b) => String(b || "").toLowerCase() === key);
      return exists ? removeValue(prev, next) : addUniqueValue(prev, next);
    });
  }

  function handleCountryToggle(value) {
    const next = String(value || "").toUpperCase().trim();
    if (!next) return;
    setCountry((prev) => {
      const key = next.toLowerCase();
      const exists = prev.some((c) => String(c || "").toLowerCase() === key);
      const updated = exists ? removeValue(prev, next) : addUniqueValue(prev, next, { upper: true });
      if (!updated.includes("US")) setUsRegion("");
      return updated;
    });
  }

  useEffect(() => {
    if (!readyRef.current || syncingRef.current) return;
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) return;

    if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    applyTimerRef.current = setTimeout(() => {
      const params = buildParams();
      const qs = params.toString();
      const target = qs ? `${submitPath}?${qs}` : submitPath;
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== target) router.push(target);
    }, 220);

    return () => {
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, builder, yearMin, yearMax, priceMin, priceMax, loaUnit, loaMin, loaMax, country, usRegion, isUSA, submitPath, router]);

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

  async function saveSearch() {
    const params = buildParams();
    const qs = params.toString();
    const path = qs ? `${submitPath}?${qs}` : submitPath;
    const absolute = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(absolute);
      setSaveMsg("Search link copied.");
      setTimeout(() => setSaveMsg(""), 1800);
    } catch {
      setSaveMsg("Could not copy link.");
      setTimeout(() => setSaveMsg(""), 1800);
    }
  }

  const emailHref = useMemo(() => {
    const params = buildParams();
    const qs = params.toString();
    const rel = qs ? `${submitPath}?${qs}` : submitPath;
    const absolute = typeof window !== "undefined" ? `${window.location.origin}${rel}` : rel;
    const subject = "SailboatTrade Search Alert Request";
    const body = `Please create an email alert for this search:\n\n${absolute}`;
    return `mailto:support@sailboattrade.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, builder, yearMin, yearMax, priceMin, priceMax, loaUnit, loaMin, loaMax, country, usRegion, isUSA, submitPath]);

  const selectedHull = useMemo(() => {
    if (type === "monohull") return { label: "Monohull", imgSrc: "/images/hulls/monohull.png", isAll: false };
    if (type === "catamaran") return { label: "Catamaran", imgSrc: "/images/hulls/catamaran.png", isAll: false };
    if (type === "trimaran") return { label: "Trimaran", imgSrc: "/images/hulls/trimaran.png", isAll: false };
    return { label: "All", imgSrc: "", isAll: true };
  }, [type]);

  const activeFilterCount = activeFilterPills.length;

  return (
    <>
      <div className="lg:hidden pb-2">
        <div className="rounded-2xl bg-[#0a2230]/95 p-3 shadow-lg ring-1 ring-white/15 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-white">Search Filters</p>
              <button
                type="button"
                onClick={clearFilters}
                disabled={!activeFilterCount}
                className="text-xs font-semibold text-white/95 underline underline-offset-2 hover:text-white disabled:opacity-40 disabled:no-underline"
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
        <div className="fixed inset-x-0 bottom-0 top-16 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close filters panel"
            onClick={() => setMobileDrawerOpen(false)}
            className="absolute inset-0 bg-black/55"
          />

          <aside className="absolute right-0 top-0 h-full w-[min(92vw,390px)] overflow-y-auto bg-[#0a2230] p-4 shadow-2xl ring-1 ring-white/15">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-white">Search Filters</h2>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="text-sm font-semibold text-white/85 underline underline-offset-2 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5 min-h-8">
              {activeFilterPills.length ? (
                activeFilterPills.map((p) => (
                  <Pill key={`mobile-${p.id}`} onClick={p.onRemove}>
                    {p.label}
                  </Pill>
                ))
              ) : (
                <Pill>All Sailboats</Pill>
              )}
            </div>

            <div className="mt-4 space-y-3 pb-24">
              <div className={drawerSection}>
                <label className={drawerLabel}>HULL TYPE</label>
                <div className="flex flex-wrap gap-2">
                  {!showHullPicker ? (
                    <HullButton
                      active={true}
                      onClick={toggleHullPicker}
                      label={selectedHull.label}
                      imgSrc={selectedHull.imgSrc}
                      isAll={selectedHull.isAll}
                    />
                  ) : (
                    <>
                      <HullButton active={type === "both"} onClick={() => chooseHull("both")} label="All" isAll />
                      <HullButton active={type === "monohull"} onClick={() => chooseHull("monohull")} label="Monohull" imgSrc="/images/hulls/monohull.png" />
                      <HullButton active={type === "catamaran"} onClick={() => chooseHull("catamaran")} label="Catamaran" imgSrc="/images/hulls/catamaran.png" />
                      <HullButton active={type === "trimaran"} onClick={() => chooseHull("trimaran")} label="Trimaran" imgSrc="/images/hulls/trimaran.png" />
                    </>
                  )}
                </div>
              </div>

              <div className={drawerSection}>
                <label className={drawerLabel}>KEYWORD SEARCH</label>
                <input
                  type="text"
                  placeholder="Search..."
                  className={drawerInput}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div className={drawerSection}>
                <label className={drawerLabel}>BUILDER</label>
                <details className="group">
                  <summary
                    className={`${drawerSelect} list-none cursor-pointer select-none ${drawerSelectTextClass(builder)} flex items-center justify-between [&::-webkit-details-marker]:hidden`}
                  >
                    <span>{builder.length ? `${builder.length} selected` : "Select builders"}</span>
                    <span aria-hidden="true" className="text-xs text-slate-500 transition group-open:rotate-180">
                      ▼
                    </span>
                  </summary>
                  <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-white/20 bg-white p-2">
                    <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Popular</p>
                    <div className="space-y-1">
                      {popularBuilders.map((b) => (
                        <button
                          key={`mobile-builder-pop-${b}`}
                          type="button"
                          onClick={() => handleBuilderToggle(b)}
                          aria-pressed={builder.some((v) => String(v || "").toLowerCase() === b.toLowerCase())}
                          className={pickerRowClass(builder.some((v) => String(v || "").toLowerCase() === b.toLowerCase()))}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                    <p className="px-1 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">A-Z</p>
                    <div className="space-y-1">
                      {otherBuilders.map((b) => (
                        <button
                          key={`mobile-builder-az-${b}`}
                          type="button"
                          onClick={() => handleBuilderToggle(b)}
                          aria-pressed={builder.some((v) => String(v || "").toLowerCase() === b.toLowerCase())}
                          className={pickerRowClass(builder.some((v) => String(v || "").toLowerCase() === b.toLowerCase()))}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 border-t border-slate-200 pt-2">
                      <button
                        type="button"
                        onClick={() => handleBuilderToggle("Other")}
                        aria-pressed={builder.some((v) => String(v || "").toLowerCase() === "other")}
                        className={pickerRowClass(builder.some((v) => String(v || "").toLowerCase() === "other"))}
                      >
                        Other
                      </button>
                    </div>
                  </div>
                </details>
              </div>

              <div className={drawerSection}>
                <label className={drawerLabel}>YEAR</label>
                <div className="grid grid-cols-2 gap-2">
                  <select className={`${drawerSelect} ${drawerSelectTextClass(yearMin)}`} value={yearMin} onChange={(e) => setYearMin(e.target.value)} aria-label="Minimum year">
                    <option value="">Min</option>
                    {yearOptions.map((y) => (
                      <option key={`mobile-year-min-${y}`} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <select className={`${drawerSelect} ${drawerSelectTextClass(yearMax)}`} value={yearMax} onChange={(e) => setYearMax(e.target.value)} aria-label="Maximum year">
                    <option value="">Max</option>
                    {yearOptions.map((y) => (
                      <option key={`mobile-year-max-${y}`} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={drawerSection}>
                <div className="flex items-center justify-between gap-2">
                  <label className={drawerLabel}>LOA</label>
                  <SmallUnitToggle value={loaUnit} onChange={setLoaUnit} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select className={`${drawerSelect} ${drawerSelectTextClass(loaMin)}`} value={loaMin} onChange={(e) => setLoaMin(e.target.value)} aria-label={`Minimum LOA (${loaUnit})`}>
                    <option value="">Min</option>
                    {loaOptions.map((v) => (
                      <option key={`mobile-loa-min-${loaUnit}-${v}`} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <select className={`${drawerSelect} ${drawerSelectTextClass(loaMax)}`} value={loaMax} onChange={(e) => setLoaMax(e.target.value)} aria-label={`Maximum LOA (${loaUnit})`}>
                    <option value="">Max</option>
                    {loaOptions.map((v) => (
                      <option key={`mobile-loa-max-${loaUnit}-${v}`} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={drawerSection}>
                <label className={drawerLabel}>PRICE</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Min"
                    className={drawerInput}
                    value={formatPriceInput(priceMin)}
                    onChange={(e) => setPriceMin(digitsOnly(e.target.value))}
                    aria-label="Minimum price"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Max"
                    className={drawerInput}
                    value={formatPriceInput(priceMax)}
                    onChange={(e) => setPriceMax(digitsOnly(e.target.value))}
                    aria-label="Maximum price"
                  />
                </div>
              </div>

              <div className={drawerSection}>
                <label className={drawerLabel}>{isUSA ? "COUNTRY / USA REGION" : "COUNTRY"}</label>
                <div className="grid grid-cols-1 gap-2">
                  <details className="group">
                    <summary
                      className={`${drawerSelect} list-none cursor-pointer select-none ${drawerSelectTextClass(country)} flex items-center justify-between [&::-webkit-details-marker]:hidden`}
                    >
                      <span>{country.length ? `${country.length} selected` : "Select countries"}</span>
                      <span aria-hidden="true" className="text-xs text-slate-500 transition group-open:rotate-180">
                        ▼
                      </span>
                    </summary>
                    <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-white/20 bg-white p-2 space-y-1">
                      {countryOptionsNoBlank.map((c) => (
                        <button
                          key={`mobile-country-${c.value}`}
                          type="button"
                          onClick={() => handleCountryToggle(c.value)}
                          aria-pressed={country.some((v) => String(v || "").toLowerCase() === String(c.value).toLowerCase())}
                          className={pickerRowClass(
                            country.some((v) => String(v || "").toLowerCase() === String(c.value).toLowerCase())
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </details>

                  {isUSA ? (
                    <select
                      className={`${drawerSelect} ${drawerSelectTextClass(usRegion)}`}
                      value={usRegion}
                      onChange={(e) => setUsRegion(e.target.value)}
                      aria-label="USA Region"
                    >
                      {US_REGION_OPTIONS.map((o) => (
                        <option key={`mobile-us-region-${o.value || "all"}`} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end border-t border-white/15 pt-3">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[12px] font-semibold text-white/95 underline underline-offset-2 hover:text-white"
                >
                  Clear all filters
                </button>
              </div>
            </div>

            <div className="sticky bottom-0 -mx-4 border-t border-white/15 bg-[#0a2230]/95 px-4 py-3 backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  applyNow();
                  setMobileDrawerOpen(false);
                }}
                className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#f3b23f] px-6 text-sm font-extrabold text-[#0a2230] hover:bg-[#f9c860]"
              >
                Apply Filters
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <aside className="hidden lg:block rounded-2xl border border-slate-200 bg-[#efefef] p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[18px] leading-tight font-extrabold text-[#5a5a5a]">
            Your Search Includes:
          </h2>
          <button
            type="button"
            onClick={clearFilters}
            className="text-[12px] font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-800"
          >
            Clear all filters
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 min-h-8">
          {activeFilterPills.length ? (
            activeFilterPills.map((p) => (
              <Pill key={p.id} onClick={p.onRemove}>
                {p.label}
              </Pill>
            ))
          ) : (
            <Pill>All Sailboats</Pill>
          )}
        </div>

        <div className="mt-3 space-y-1.5">
          <Link href="/dashboard/favorites" className="block rounded-md bg-[#f3b23f] px-4 py-[7px] text-center text-[12px] font-extrabold tracking-wide text-[#0a2230] hover:bg-[#f9c860]">
            MY FAVORITES
          </Link>
          <button
            type="button"
            onClick={saveSearch}
            className="w-full rounded-md bg-[#f3b23f] px-4 py-[7px] text-center text-[12px] font-extrabold tracking-wide text-[#0a2230] hover:bg-[#f9c860]"
          >
            SAVE SEARCH
          </button>
          <a href={emailHref} className="block rounded-md bg-[#f3b23f] px-4 py-[7px] text-center text-[12px] font-extrabold tracking-wide text-[#0a2230] hover:bg-[#f9c860]">
            EMAIL ALERT
          </a>
          {saveMsg ? <div className="text-[12px] font-semibold text-slate-600">{saveMsg}</div> : null}
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-2 border-t border-slate-300 pt-3">
            <label className="block text-[12px] font-bold tracking-wide text-slate-700">HULL TYPE</label>
            <div className="flex flex-wrap gap-2">
              {!showHullPicker ? (
                <HullButton
                  active={true}
                  onClick={toggleHullPicker}
                  label={selectedHull.label}
                  imgSrc={selectedHull.imgSrc}
                  isAll={selectedHull.isAll}
                />
              ) : (
                <>
                  <HullButton
                    active={type === "both"}
                    onClick={() => chooseHull("both")}
                    label="All"
                    isAll
                  />
                  <HullButton
                    active={type === "monohull"}
                    onClick={() => chooseHull("monohull")}
                    label="Monohull"
                    imgSrc="/images/hulls/monohull.png"
                  />
                  <HullButton
                    active={type === "catamaran"}
                    onClick={() => chooseHull("catamaran")}
                    label="Catamaran"
                    imgSrc="/images/hulls/catamaran.png"
                  />
                  <HullButton
                    active={type === "trimaran"}
                    onClick={() => chooseHull("trimaran")}
                    label="Trimaran"
                    imgSrc="/images/hulls/trimaran.png"
                  />
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-300 pt-3">
            <label className="block text-[12px] font-bold tracking-wide text-slate-700">KEYWORD SEARCH</label>
            <input
              type="text"
              placeholder="Search..."
              className={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="space-y-2 border-t border-slate-300 pt-3">
            <label className="block text-[12px] font-bold tracking-wide text-slate-700">BUILDER</label>
            <details className="group">
              <summary
                className={`${select} list-none cursor-pointer select-none ${selectTextClass(builder)} flex items-center justify-between [&::-webkit-details-marker]:hidden`}
              >
                <span>{builder.length ? `${builder.length} selected` : "Select builders"}</span>
                <span aria-hidden="true" className="text-xs text-slate-500 transition group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-300 bg-white p-2">
                <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Popular</p>
                <div className="space-y-1">
                  {popularBuilders.map((b) => (
                    <button
                      key={`desktop-builder-pop-${b}`}
                      type="button"
                      onClick={() => handleBuilderToggle(b)}
                      aria-pressed={builder.some((v) => String(v || "").toLowerCase() === b.toLowerCase())}
                      className={pickerRowClass(builder.some((v) => String(v || "").toLowerCase() === b.toLowerCase()))}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <p className="px-1 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">A-Z</p>
                <div className="space-y-1">
                  {otherBuilders.map((b) => (
                    <button
                      key={`desktop-builder-az-${b}`}
                      type="button"
                      onClick={() => handleBuilderToggle(b)}
                      aria-pressed={builder.some((v) => String(v || "").toLowerCase() === b.toLowerCase())}
                      className={pickerRowClass(builder.some((v) => String(v || "").toLowerCase() === b.toLowerCase()))}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <button
                    type="button"
                    onClick={() => handleBuilderToggle("Other")}
                    aria-pressed={builder.some((v) => String(v || "").toLowerCase() === "other")}
                    className={pickerRowClass(builder.some((v) => String(v || "").toLowerCase() === "other"))}
                  >
                    Other
                  </button>
                </div>
              </div>
            </details>
          </div>

          <div className="space-y-2 border-t border-slate-300 pt-3">
            <label className="block text-[12px] font-bold tracking-wide text-slate-700">YEAR</label>
            <div className="grid grid-cols-2 gap-2">
              <select className={`${select} ${selectTextClass(yearMin)}`} value={yearMin} onChange={(e) => setYearMin(e.target.value)} aria-label="Minimum year">
                <option value="">Min</option>
                {yearOptions.map((y) => (
                  <option key={`year-min-${y}`} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select className={`${select} ${selectTextClass(yearMax)}`} value={yearMax} onChange={(e) => setYearMax(e.target.value)} aria-label="Maximum year">
                <option value="">Max</option>
                {yearOptions.map((y) => (
                  <option key={`year-max-${y}`} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-300 pt-3">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-[12px] font-bold tracking-wide text-slate-700">LOA</label>
              <SmallUnitToggle value={loaUnit} onChange={setLoaUnit} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className={`${select} ${selectTextClass(loaMin)}`} value={loaMin} onChange={(e) => setLoaMin(e.target.value)} aria-label={`Minimum LOA (${loaUnit})`}>
                <option value="">Min</option>
                {loaOptions.map((v) => (
                  <option key={`loa-min-${loaUnit}-${v}`} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select className={`${select} ${selectTextClass(loaMax)}`} value={loaMax} onChange={(e) => setLoaMax(e.target.value)} aria-label={`Maximum LOA (${loaUnit})`}>
                <option value="">Max</option>
                {loaOptions.map((v) => (
                  <option key={`loa-max-${loaUnit}-${v}`} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-300 pt-3">
            <label className="block text-[12px] font-bold tracking-wide text-slate-700">PRICE</label>
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

          <div className="space-y-2 border-t border-slate-300 pt-3">
            <label className="block text-[12px] font-bold tracking-wide text-slate-700">
              {isUSA ? "COUNTRY / USA REGION" : "COUNTRY"}
            </label>

            <div className="grid grid-cols-1 gap-2">
              <details className="group">
                <summary
                  className={`${select} list-none cursor-pointer select-none ${selectTextClass(country)} flex items-center justify-between [&::-webkit-details-marker]:hidden`}
                >
                  <span>{country.length ? `${country.length} selected` : "Select countries"}</span>
                  <span aria-hidden="true" className="text-xs text-slate-500 transition group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-300 bg-white p-2 space-y-1">
                  {countryOptionsNoBlank.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleCountryToggle(c.value)}
                      aria-pressed={country.some((v) => String(v || "").toLowerCase() === String(c.value).toLowerCase())}
                      className={pickerRowClass(
                        country.some((v) => String(v || "").toLowerCase() === String(c.value).toLowerCase())
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </details>

              {isUSA ? (
                <select
                  className={`${select} ${selectTextClass(usRegion)}`}
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
              ) : null}
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-300 pt-3">
            <button
              type="button"
              onClick={clearFilters}
              className="text-[12px] font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-800"
            >
              Clear all filters
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
