// components/FilterSidebar.js
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

const RAW_BUILDERS = [
  "Beneteau","Jeanneau","Lagoon","Catalina","Fountaine Pajot","Dufour","Bavaria",
  "Hunter","Hanse","X-Yachts","Oyster","Hallberg-Rassy","Island Packet","J/Boats",
  "Elan","Excess","Hylas","Leopard","Bali","Nautitech",
];
const TOP5 = ["Beneteau","Jeanneau","Lagoon","Catalina","Bavaria"];

const POPULAR_COUNTRIES_PREF = [
  "USA","United States","United Kingdom","UK","France","Italy","Spain","Greece",
  "Australia","New Zealand","Canada","Croatia","Netherlands","Sweden","Portugal",
];

const US_REGION_OPTIONS = [
  { label: "West Coast", value: "WEST_COAST" },
  { label: "East Coast", value: "EAST_COAST" },
  { label: "Gulf Coast", value: "GULF_COAST" },
  { label: "Great Lakes", value: "GREAT_LAKES" },
  { label: "Other Inland waters", value: "OTHER_INLAND_WATERS" },
];

function prettyUsRegion(v) {
  const found = US_REGION_OPTIONS.find((o) => o.value === v);
  return found ? found.label : v;
}

function normalizeCountry(raw) {
  const s = String(raw ?? "").trim();
  const lower = s.toLowerCase();
  if (
    lower === "usa" ||
    lower === "us" ||
    lower === "u.s." ||
    lower === "u.s.a." ||
    lower === "united states" ||
    lower === "united states of america"
  ) {
    return "United States";
  }
  return s;
}

function isUSA(raw) {
  return normalizeCountry(raw) === "United States";
}

function orderBuilders() {
  const set = new Set(RAW_BUILDERS.map((m) => m.trim()));
  const deduped = Array.from(set);
  const rest = deduped.filter((m) => !TOP5.includes(m)).sort((a, b) => a.localeCompare(b));
  return [...TOP5, ...rest];
}

function useDebounced(fn, delay = 400) {
  const t = useRef();
  return (...args) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), delay);
  };
}

export default function FilterSidebar({ initial = {}, countries = [], inDrawer = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const formRef = useRef(null);

  const builders = useMemo(orderBuilders, []);

  const setParam = (k, v) => {
    const next = new URLSearchParams(sp.toString());
    if (v === "" || v == null) next.delete(k);
    else next.set(k, String(v));
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const debounced = useDebounced(setParam, 400);
  const clearAll = () => router.push(pathname, { scroll: false });

  const selectedCountry = normalizeCountry(sp.get("country") ?? initial.country ?? "");
  const showUsRegion = isUSA(selectedCountry);

  useEffect(() => {
    const f = formRef.current;
    if (!f) return;

    [
      "type",
      "builder",
      "country",
      "usRegion",
      "yearMin",
      "yearMax",
      "loaMin",
      "loaMax",
      "loaUnit",
    ].forEach((k) => {
      const v = sp.get(k) ?? initial[k] ?? "";
      if (f[k] !== undefined) f[k].value = v;
    });
  }, [sp, initial]);

  useEffect(() => {
    const countryFromUrl = sp.get("country") ?? initial.country ?? "";
    const usa = isUSA(countryFromUrl);
    const hasUsRegion = !!sp.get("usRegion");
    if (!usa && hasUsRegion) setParam("usRegion", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const chips = useMemo(() => {
    const list = [];
    const gt = (k) => sp.get(k);

    const type = (gt("type") || initial.type || "both").toLowerCase();
    if (type && type !== "both") {
      const map = { monohull: "Monohull", catamaran: "Catamaran", trimaran: "Trimaran" };
      list.push({ k: "type", label: map[type] || type });
    }

    const builder = gt("builder") || initial.builder;
    if (builder) list.push({ k: "builder", label: builder === "Other" ? "Builder: Other" : builder });

    const country = gt("country");
    if (country) list.push({ k: "country", label: normalizeCountry(country) });

    const usRegion = gt("usRegion") || initial.usRegion || "";
    const countryNorm = normalizeCountry(country || initial.country || "");
    if (isUSA(countryNorm) && usRegion) {
      list.push({ k: "usRegion", label: `USA: ${prettyUsRegion(usRegion)}` });
    }

    const y1 = gt("yearMin"), y2 = gt("yearMax");
    if (y1 || y2) list.push({ k: "year", label: `Year ${y1 ?? "—"}–${y2 ?? "—"}` });

    const l1 = gt("loaMin"), l2 = gt("loaMax"), lu = gt("loaUnit") || initial.loaUnit || "ft";
    if (l1 || l2) list.push({ k: "loa", label: `LOA ${l1 ?? "—"}–${l2 ?? "—"} ${lu}` });

    return list;
  }, [sp, initial]);

  const removeChip = (key) => {
    if (key === "year") return (setParam("yearMin",""), setParam("yearMax",""));
    if (key === "loa") return (setParam("loaMin",""), setParam("loaMax",""));
    setParam(key, "");
  };

  const countriesSet = new Set(countries.filter(Boolean).map((c) => c.trim()));
  const uniqueCountries = Array.from(countriesSet).sort((a, b) => a.localeCompare(b));
  const preferredOrder = ["USA", ...POPULAR_COUNTRIES_PREF.filter((c) => c !== "USA")];
  const topGroup = preferredOrder.filter((c) => countriesSet.has(c));
  const otherGroup = uniqueCountries.filter((c) => !topGroup.includes(c));
  const orderedCountries = [...topGroup, ...otherGroup];

  const chipBtn =
    "inline-flex items-center gap-1 rounded-full bg-white text-[#0a2230] text-xs px-2.5 py-1 " +
    "ring-2 ring-[#c8a44d] hover:bg-slate-50 transition";

  const field =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0a2230] " +
    "outline-none focus:ring-2 focus:ring-[#c8a44d]/30";

  const miniSelect =
    "h-8 rounded-full border border-slate-300 bg-white px-3 text-xs text-[#0a2230] " +
    "shadow-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/30";

  const selectedLoaUnit = sp.get("loaUnit") || initial.loaUnit || "ft";
  const selectedUsRegion = sp.get("usRegion") || initial.usRegion || "";

  const wrapperClass = inDrawer
    ? "rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4"
    : `
        rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4
        lg:sticky lg:top-24
        lg:max-h-[calc(100vh-7rem)] lg:overflow-auto
      `;

  return (
    <div className={wrapperClass}>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[#0a2230]">Applied filters</h3>
          <button
            type="button"
            onClick={() => router.push(pathname, { scroll: false })}
            className="text-xs font-semibold text-[#0a2230]/70 hover:text-[#0a2230] underline underline-offset-2"
          >
            Reset
          </button>
        </div>

        {chips.length === 0 ? (
          <div className="text-xs text-slate-500">No filters applied.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {chips.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => removeChip(c.k)}
                className={chipBtn}
                title="Remove filter"
              >
                {c.label} <span aria-hidden>✕</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <form ref={formRef} className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="type" className="block text-sm font-semibold text-[#0a2230] mb-2">
            Hull Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={initial.type ?? "both"}
            onChange={(e) => setParam("type", e.target.value)}
            className={field}
          >
            <option value="both">All hull types</option>
            <option value="monohull">Monohull</option>
            <option value="catamaran">Catamaran</option>
            <option value="trimaran">Trimaran</option>
          </select>
        </div>

        <div>
          <label htmlFor="builder" className="block text-sm font-semibold text-[#0a2230] mb-2">
            Builder
          </label>
          <select
            id="builder"
            name="builder"
            defaultValue={initial.builder ?? ""}
            onChange={(e) => setParam("builder", e.target.value)}
            className={field}
          >
            <option value="">All builders</option>
            {TOP5.map((m) => (
              <option key={`top-${m}`} value={m}>{m}</option>
            ))}
            <option disabled>──────────</option>
            {builders.filter((m) => !TOP5.includes(m)).map((m) => (
              <option key={`az-${m}`} value={m}>{m}</option>
            ))}
            <option disabled>──────────</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#0a2230] mb-2">Year</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="yearMin"
              placeholder="Min"
              defaultValue={initial.yearMin}
              onChange={(e) => debounced("yearMin", e.target.value)}
              className={field}
            />
            <input
              type="number"
              name="yearMax"
              placeholder="Max"
              defaultValue={initial.yearMax}
              onChange={(e) => debounced("yearMax", e.target.value)}
              className={field}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-semibold text-[#0a2230]" htmlFor="loaUnit">
              LOA
            </label>
            <select
              id="loaUnit"
              name="loaUnit"
              defaultValue={selectedLoaUnit}
              onChange={(e) => setParam("loaUnit", e.target.value)}
              className={miniSelect}
              title="Unit"
            >
              <option value="ft">Feet</option>
              <option value="m">Meters</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="loaMin"
              placeholder="Min"
              defaultValue={initial.loaMin}
              onChange={(e) => debounced("loaMin", e.target.value)}
              className={field}
            />
            <input
              type="number"
              name="loaMax"
              placeholder="Max"
              defaultValue={initial.loaMax}
              onChange={(e) => debounced("loaMax", e.target.value)}
              className={field}
            />
          </div>
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-semibold text-[#0a2230] mb-2">
            Country
          </label>
          <select
            id="country"
            name="country"
            defaultValue={initial.country}
            onChange={(e) => setParam("country", e.target.value)}
            className={field}
          >
            <option value="">All countries</option>
            {orderedCountries.map((c) => (
              <option key={`c-${c}`} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {showUsRegion && (
          <div>
            <label htmlFor="usRegion" className="block text-sm font-semibold text-[#0a2230] mb-2">
              USA Region
            </label>
            <select
              id="usRegion"
              name="usRegion"
              defaultValue={selectedUsRegion}
              onChange={(e) => setParam("usRegion", e.target.value)}
              className={field}
            >
              <option value="">All USA regions</option>
              {US_REGION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </form>
    </div>
  );
}
