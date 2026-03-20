// components/AdvancedSearchBar.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { getCountryOptions } from "@/lib/countries";
import { getBuilderGroups } from "@/lib/builders";

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

const EMPTY_INITIAL_VALUES = Object.freeze({});

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

function numericText(value, maxLength = 4) {
  return digitsOnly(value).slice(0, maxLength);
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

function truncateWithEllipsis(value, maxLength = 18) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function formatSelectionSummary(values, { fallback, maxLength = 18 } = {}) {
  const list = Array.isArray(values) ? values.filter(Boolean) : [];
  if (!list.length) return fallback;
  return `${list.length} (${truncateWithEllipsis(list.join(", "), maxLength)})`;
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

function ValuePicker({
  detailsRef,
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  summaryClassName,
  panelClassName,
  inputClassName,
  rowClassName,
  anchorValue,
  maxLength = 4,
  optionLabel = (option) => option,
}) {
  const scrollBoxRef = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef(new Map());

  const centerOnValue = (targetValue) => {
    const key = String(targetValue || "").trim();
    if (!key) return;
    const container = scrollBoxRef.current;
    const node = optionRefs.current.get(key);
    if (!container || !node) return;
    const nextTop = node.offsetTop - container.clientHeight / 2 + node.offsetHeight / 2;
    container.scrollTop = Math.max(0, nextTop);
  };

  const handleToggle = (e) => {
    if (!e.currentTarget.open) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      centerOnValue(value || anchorValue);
    });
  };

  const chooseValue = (nextValue) => {
    onChange(String(nextValue || ""));
    detailsRef?.current?.removeAttribute?.("open");
  };

  return (
    <details className="group relative" ref={detailsRef} onToggle={handleToggle}>
      <summary
        className={`${summaryClassName} list-none cursor-pointer select-none flex items-center justify-between [&::-webkit-details-marker]:hidden`}
        aria-label={ariaLabel}
      >
        <span>{value || placeholder}</span>
        <span aria-hidden="true" className="text-xs text-slate-500 transition group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className={panelClassName}>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => onChange(numericText(e.target.value, maxLength))}
          placeholder={placeholder}
          className={inputClassName}
          aria-label={`${ariaLabel} value`}
        />
        <div ref={scrollBoxRef} className="mt-2 max-h-44 overflow-y-auto space-y-1">
          <button type="button" onClick={() => chooseValue("")} className={rowClassName(!value)}>
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              key={`${ariaLabel}-${option}`}
              type="button"
              ref={(node) => {
                if (node) optionRefs.current.set(String(option), node);
                else optionRefs.current.delete(String(option));
              }}
              onClick={() => chooseValue(option)}
              className={rowClassName(String(value) === String(option))}
            >
              {optionLabel(option)}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}

export default function AdvancedSearchBar({ variant = "dark", submitPath = "/listings", initialValues = EMPTY_INITIAL_VALUES }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
  const [country, setCountry] = useState(initial.country); // ✅ ISO alpha-2 or ""
  const [usRegion, setUsRegion] = useState(initial.usRegion);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [desktopHullMenuOpen, setDesktopHullMenuOpen] = useState(false);
  const desktopHullMenuRef = useRef(null);
  const mobileBuilderDetailsRef = useRef(null);
  const mobileCountryDetailsRef = useRef(null);
  const mobileYearMinDetailsRef = useRef(null);
  const mobileYearMaxDetailsRef = useRef(null);
  const mobileLoaMinDetailsRef = useRef(null);
  const mobileLoaMaxDetailsRef = useRef(null);
  const desktopBuilderDetailsRef = useRef(null);
  const desktopCountryDetailsRef = useRef(null);
  const desktopYearMinDetailsRef = useRef(null);
  const desktopYearMaxDetailsRef = useRef(null);
  const desktopLoaMinDetailsRef = useRef(null);
  const desktopLoaMaxDetailsRef = useRef(null);

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

  const isUSA = country.includes("US");
  const loaOptions = useMemo(() => buildLoaOptions(loaUnit), [loaUnit]);
  const countryOptionsNoBlank = useMemo(() => countryOptions.filter((c) => c?.value), [countryOptions]);
  const countryLabelMap = useMemo(
    () => new Map(countryOptionsNoBlank.map((option) => [String(option.value).toUpperCase(), option.label])),
    [countryOptionsNoBlank],
  );
  const builderSummary = useMemo(
    () => formatSelectionSummary(builder, { fallback: "Select builders" }),
    [builder],
  );
  const countrySummary = useMemo(
    () =>
      formatSelectionSummary(
        country.map((code) => countryLabelMap.get(String(code).toUpperCase()) || code),
        { fallback: "Select countries" },
      ),
    [country, countryLabelMap],
  );
  const activeFilterCount = useMemo(() => {
    const hasQuery = !!String(q || "").trim();
    const hasType = String(type || "both").toLowerCase() !== "both";
    const hasBuilder = builder.length > 0;
    const hasYearMin = !!String(yearMin || "").trim();
    const hasYearMax = !!String(yearMax || "").trim();
    const hasPriceMin = !!String(priceMin || "").trim();
    const hasPriceMax = !!String(priceMax || "").trim();
    const hasLoaMin = !!String(loaMin || "").trim();
    const hasLoaMax = !!String(loaMax || "").trim();
    const hasCountry = country.length > 0;
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

  useEffect(() => {
    if (typeof document === "undefined") return;

    const detailRefs = [
      mobileBuilderDetailsRef,
      mobileCountryDetailsRef,
      mobileYearMinDetailsRef,
      mobileYearMaxDetailsRef,
      mobileLoaMinDetailsRef,
      mobileLoaMaxDetailsRef,
      desktopBuilderDetailsRef,
      desktopCountryDetailsRef,
      desktopYearMinDetailsRef,
      desktopYearMaxDetailsRef,
      desktopLoaMinDetailsRef,
      desktopLoaMaxDetailsRef,
    ];

    const onMouseDown = (e) => {
      for (const ref of detailRefs) {
        const node = ref.current;
        if (!node?.hasAttribute?.("open")) continue;
        if (node.contains(e.target)) continue;
        node.removeAttribute("open");
      }
    };

    const onKey = (e) => {
      if (e.key !== "Escape") return;
      for (const ref of detailRefs) {
        ref.current?.removeAttribute?.("open");
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setMobileDrawerOpen(false);
    setDesktopHullMenuOpen(false);
  }, [pathname, searchParams]);

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
    Array.isArray(value)
      ? value.length
        ? "!text-[#0a2230]"
        : "!text-slate-400"
      : String(value || "").trim()
      ? "!text-[#0a2230]"
      : "!text-slate-400";
  const pickerRowClass = (active) =>
    [
      "w-full rounded-md px-2 py-1.5 text-left text-[13px] transition",
      active ? "bg-[#0a2230] text-white font-semibold" : "text-[#0a2230] hover:bg-slate-50",
    ].join(" ");
  const pickerPanelClass =
    "mt-2 rounded-xl border border-white/20 bg-white p-2 shadow-xl";

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

  const handleBuilderToggle = (value) => {
    const next = String(value || "").trim();
    if (!next) return;
    setBuilder((prev) => {
      const key = next.toLowerCase();
      const exists = prev.some((b) => String(b || "").toLowerCase() === key);
      return exists ? removeValue(prev, next) : addUniqueValue(prev, next);
    });
  };

  const handleCountryToggle = (value) => {
    const next = String(value || "").toUpperCase().trim();
    if (!next) return;
    setCountry((prev) => {
      const key = next.toLowerCase();
      const exists = prev.some((c) => String(c || "").toLowerCase() === key);
      const updated = exists ? removeValue(prev, next) : addUniqueValue(prev, next, { upper: true });
      if (!updated.includes("US")) setUsRegion("");
      return updated;
    });
  };

  const clearFilters = () => {
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
  };

  return (
    <section className="w-full">
      <div className="min-[901px]:hidden pb-2">
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
        <div className="fixed inset-x-0 bottom-0 top-16 z-[70] min-[901px]:hidden">
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
                <details className="group" ref={mobileBuilderDetailsRef}>
                  <summary
                    className={`${select} list-none cursor-pointer select-none ${selectTextClass(builder)} flex items-center justify-between [&::-webkit-details-marker]:hidden`}
                  >
                      <span>{builderSummary}</span>
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

              <div className={mobileDrawerSection}>
                <label className={mobileDrawerLabel}>YEAR</label>
                <div className="grid grid-cols-2 gap-2">
                  <ValuePicker
                    detailsRef={mobileYearMinDetailsRef}
                    value={yearMin}
                    onChange={setYearMin}
                    options={yearOptions}
                    placeholder="Min"
                    ariaLabel="Minimum year"
                    summaryClassName={`${select} ${selectTextClass(yearMin)}`}
                    panelClassName={pickerPanelClass}
                    inputClassName={input}
                    rowClassName={pickerRowClass}
                    anchorValue="2000"
                    maxLength={4}
                  />
                  <ValuePicker
                    detailsRef={mobileYearMaxDetailsRef}
                    value={yearMax}
                    onChange={setYearMax}
                    options={yearOptions}
                    placeholder="Max"
                    ariaLabel="Maximum year"
                    summaryClassName={`${select} ${selectTextClass(yearMax)}`}
                    panelClassName={pickerPanelClass}
                    inputClassName={input}
                    rowClassName={pickerRowClass}
                    anchorValue="2015"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className={mobileDrawerSection}>
                <div className="flex items-center justify-between gap-2">
                  <label className={mobileDrawerLabel}>Length</label>
                  <SmallUnitToggle value={loaUnit} onChange={setLoaUnit} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ValuePicker
                    detailsRef={mobileLoaMinDetailsRef}
                    value={loaMin}
                    onChange={setLoaMin}
                    options={loaOptions}
                    placeholder={`${loaUnit.toUpperCase()} Min`}
                    ariaLabel={`Minimum LOA (${loaUnit})`}
                    summaryClassName={`${select} ${selectTextClass(loaMin)}`}
                    panelClassName={pickerPanelClass}
                    inputClassName={input}
                    rowClassName={pickerRowClass}
                    anchorValue={loaUnit === "m" ? "6" : "20"}
                    maxLength={3}
                    optionLabel={(option) => `${option} ${loaUnit}`}
                  />
                  <ValuePicker
                    detailsRef={mobileLoaMaxDetailsRef}
                    value={loaMax}
                    onChange={setLoaMax}
                    options={loaOptions}
                    placeholder={`${loaUnit.toUpperCase()} Max`}
                    ariaLabel={`Maximum LOA (${loaUnit})`}
                    summaryClassName={`${select} ${selectTextClass(loaMax)}`}
                    panelClassName={pickerPanelClass}
                    inputClassName={input}
                    rowClassName={pickerRowClass}
                    anchorValue={loaUnit === "m" ? "18" : "60"}
                    maxLength={3}
                    optionLabel={(option) => `${option} ${loaUnit}`}
                  />
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

                <div className="grid grid-cols-1 gap-2">
                  <details className="group" ref={mobileCountryDetailsRef}>
                    <summary
                      className={`${select} list-none cursor-pointer select-none ${selectTextClass(country)} flex items-center justify-between [&::-webkit-details-marker]:hidden`}
                    >
                      <span>{countrySummary}</span>
                      <span aria-hidden="true" className="text-xs text-slate-500 transition group-open:rotate-180">
                        ▼
                      </span>
                    </summary>
                    <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-white/20 bg-white p-2 space-y-1">
                      {countryOptionsNoBlank.map((c) => (
                        <button
                          key={`mobile-home-country-${c.value}`}
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
                        <option key={`mobile-home-us-region-${o.value || "all"}`} value={o.value}>
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

      <form onSubmit={submit} className={`${shell} relative z-[40] max-[900px]:hidden`}>
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

            <div className="min-w-0 relative z-[70]" ref={desktopHullMenuRef}>
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
                  <div className="absolute left-1/2 top-[calc(100%+8px)] z-[90] -translate-x-1/2 rounded-xl border border-white/20 bg-[#0f2a3b]/98 p-2 shadow-xl">
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

            <div className="min-w-0 relative z-[80]">
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
              <details className="group relative mt-2" ref={desktopBuilderDetailsRef}>
                <summary
                  className={`${select} list-none cursor-pointer select-none ${selectTextClass(builder)} flex items-center justify-between [&::-webkit-details-marker]:hidden`}
                  aria-label="Builder"
                >
                  <span>{builderSummary}</span>
                  <span aria-hidden="true" className="text-xs text-slate-500 transition group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <div className="absolute left-0 right-0 top-full z-[90] mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/20 bg-white p-2 shadow-xl">
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
          </div>

          {/* ROW 2 */}
          <div className="mt-3 grid grid-cols-[220px_220px_220px] items-end justify-center gap-3">
            <div className="min-w-0 relative z-[70]">
              <label className={label}>Year</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <ValuePicker
                  detailsRef={desktopYearMinDetailsRef}
                  value={yearMin}
                  onChange={setYearMin}
                  options={yearOptions}
                  placeholder="Min"
                  ariaLabel="Minimum year"
                  summaryClassName={`${select} w-full ${selectTextClass(yearMin)}`}
                  panelClassName={`absolute left-0 right-0 top-full z-[90] ${pickerPanelClass}`}
                  inputClassName={input}
                  rowClassName={pickerRowClass}
                  anchorValue="2000"
                  maxLength={4}
                />
                <ValuePicker
                  detailsRef={desktopYearMaxDetailsRef}
                  value={yearMax}
                  onChange={setYearMax}
                  options={yearOptions}
                  placeholder="Max"
                  ariaLabel="Maximum year"
                  summaryClassName={`${select} w-full ${selectTextClass(yearMax)}`}
                  panelClassName={`absolute left-0 right-0 top-full z-[90] ${pickerPanelClass}`}
                  inputClassName={input}
                  rowClassName={pickerRowClass}
                  anchorValue="2015"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="min-w-0">
              <label className={label}>
                Length
                <SmallUnitToggle value={loaUnit} onChange={setLoaUnit} />
              </label>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <ValuePicker
                  detailsRef={desktopLoaMinDetailsRef}
                  value={loaMin}
                  onChange={setLoaMin}
                  options={loaOptions}
                  placeholder={`${loaUnit.toUpperCase()} Min`}
                  ariaLabel={`Minimum LOA (${loaUnit})`}
                  summaryClassName={`${select} w-full ${selectTextClass(loaMin)}`}
                  panelClassName={`absolute left-0 right-0 top-full z-[90] ${pickerPanelClass}`}
                  inputClassName={input}
                  rowClassName={pickerRowClass}
                  anchorValue={loaUnit === "m" ? "6" : "20"}
                  maxLength={3}
                  optionLabel={(option) => `${option} ${loaUnit}`}
                />
                <ValuePicker
                  detailsRef={desktopLoaMaxDetailsRef}
                  value={loaMax}
                  onChange={setLoaMax}
                  options={loaOptions}
                  placeholder={`${loaUnit.toUpperCase()} Max`}
                  ariaLabel={`Maximum LOA (${loaUnit})`}
                  summaryClassName={`${select} w-full ${selectTextClass(loaMax)}`}
                  panelClassName={`absolute left-0 right-0 top-full z-[90] ${pickerPanelClass}`}
                  inputClassName={input}
                  rowClassName={pickerRowClass}
                  anchorValue={loaUnit === "m" ? "18" : "60"}
                  maxLength={3}
                  optionLabel={(option) => `${option} ${loaUnit}`}
                />
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
                <details className="group relative" ref={desktopCountryDetailsRef}>
                  <summary
                    className={`${select} w-full list-none cursor-pointer select-none ${selectTextClass(country)} flex items-center justify-between [&::-webkit-details-marker]:hidden`}
                  >
                    <span>{countrySummary}</span>
                    <span aria-hidden="true" className="text-xs text-slate-500 transition group-open:rotate-180">
                      ▼
                    </span>
                  </summary>
                  <div className="absolute left-0 right-0 top-full z-[90] mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/20 bg-white p-2 space-y-1 shadow-xl">
                    {countryOptionsNoBlank.map((c) => (
                      <button
                        key={`desktop-home-country-${c.value}`}
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
