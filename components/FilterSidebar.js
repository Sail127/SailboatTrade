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

export default function FilterSidebar({ initial = {}, countries = [] }) {
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

  const initialBuilder = initial.builder ?? initial.make ?? "";

  useEffect(() => {
    const f = formRef.current;
    if (!f) return;
    [
      "type","builder","country","yearMin","yearMax",
      "lengthMin","lengthMax","lengthUnit","priceMin","priceMax","currency"
    ].forEach((k) => {
      const v = sp.get(k) ?? (k === "builder" ? initialBuilder : initial[k]) ?? "";
      if (f[k] !== undefined) f[k].value = v;
    });
  }, [sp, initial, initialBuilder]);

  const chips = useMemo(() => {
    const list = [];
    const gt = (k) => sp.get(k);
    const type = (gt("type") || initial.type || "both").toLowerCase();
    if (type && type !== "both") {
      const map = { monohull: "Monohull", catamaran: "Catamaran", trimaran: "Trimaran" };
      list.push({ k: "type", label: map[type] || type });
    }
    const builder = gt("builder") || initialBuilder;
    if (builder) list.push({ k: "builder", label: builder === "Other" ? "Builder: Other" : builder });
    const country = gt("country");
    if (country) list.push({ k: "country", label: country });
    const y1 = gt("yearMin"), y2 = gt("yearMax");
    if (y1 || y2) list.push({ k: "year", label: `Year ${y1 ?? "—"}–${y2 ?? "—"}` });
    const l1 = gt("lengthMin"), l2 = gt("lengthMax"), lu = gt("lengthUnit") || initial.lengthUnit || "ft";
    if (l1 || l2) list.push({ k: "length", label: `Length ${l1 ?? "—"}–${l2 ?? "—"} ${lu}` });
    const p1 = gt("priceMin"), p2 = gt("priceMax");
    const curr = gt("currency") || initial.currency || "USD";
    if (p1 || p2) list.push({ k: "price", label: `Price ${p1 ? Number(p1).toLocaleString() : "—"}–${p2 ? Number(p2).toLocaleString() : "—"} ${curr}` });
    return list;
  }, [sp, initial.lengthUnit, initial.currency, initial.type, initialBuilder]);

  const removeChip = (key) => {
    if (key === "year") return (setParam("yearMin",""), setParam("yearMax",""));
    if (key === "length") return (setParam("lengthMin",""), setParam("lengthMax",""));
    if (key === "price") return (setParam("priceMin",""), setParam("priceMax",""));
    setParam(key, "");
  };

  const buildAuthHref = (action) => {
    const q = new URLSearchParams(sp.toString());
    return `/signin?next=${encodeURIComponent(`${pathname}?${q.toString()}`)}&action=${encodeURIComponent(action)}`;
  };

  const countriesSet = new Set(countries.filter(Boolean).map((c) => c.trim()));
  const uniqueCountries = Array.from(countriesSet).sort((a, b) => a.localeCompare(b));
  const preferredOrder = ["USA", ...POPULAR_COUNTRIES_PREF.filter((c) => c !== "USA")];
  const topGroup = preferredOrder.filter((c) => countriesSet.has(c));
  const otherGroup = uniqueCountries.filter((c) => !topGroup.includes(c));
  const orderedCountries = [...topGroup, ...otherGroup];

  // ✅ GUARANTEED readable CTA style (wins against global link styles)
  const ctaBtn =
    "inline-flex w-full items-center justify-center h-10 rounded-full " +
    "bg-[#0a2230] border border-[#0a2230] shadow-sm ring-1 ring-black/5 " +
    "!text-white hover:!text-white focus:!text-white active:!text-white " +
    "[&_*]:!text-white no-underline hover:no-underline " +
    "text-sm font-semibold " +
    "hover:bg-[#0f2a3b] hover:border-[#0f2a3b] " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a44d]/50 " +
    "transition";

  const chipBtn =
    "inline-flex items-center gap-1 rounded-full bg-white text-[#0a2230] text-xs px-2.5 py-1 " +
    "ring-2 ring-[#c8a44d] hover:bg-slate-50 transition";

  const field =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0a2230] " +
    "outline-none focus:ring-2 focus:ring-[#c8a44d]/30";

  const miniSelect =
    "h-8 rounded-full border border-slate-300 bg-white px-3 text-xs text-[#0a2230] " +
    "shadow-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/30";

  const selectedCurrency = sp.get("currency") || initial.currency || "USD";
  const selectedLengthUnit = sp.get("lengthUnit") || initial.lengthUnit || "ft";

  return (
    <div
      className="
        rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4
        lg:sticky lg:top-24
        lg:max-h-[calc(100vh-7rem)] lg:overflow-auto
      "
    >
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[#0a2230]">Applied filters</h3>
          <button
            type="button"
            onClick={clearAll}
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

        <div className="mt-3 grid grid-cols-1 gap-2">
          <a href={buildAuthHref("save-search")} className={ctaBtn}>
            Save Search
          </a>
          <a href={buildAuthHref("create-email-alert")} className={ctaBtn}>
            Create Email Alert
          </a>
        </div>
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
          <label htmlFor="builder" className="block text-sm font-semibold text-[#0a2230] mb-2">
            Builder
          </label>
          <select
            id="builder"
            name="builder"
            defaultValue={initialBuilder}
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
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-semibold text-[#0a2230]" htmlFor="lengthUnit">
              Length
            </label>
            <select
              id="lengthUnit"
              name="lengthUnit"
              defaultValue={selectedLengthUnit}
              onChange={(e) => setParam("lengthUnit", e.target.value)}
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
              name="lengthMin"
              placeholder="Min"
              defaultValue={initial.lengthMin}
              onChange={(e) => debounced("lengthMin", e.target.value)}
              className={field}
            />
            <input
              type="number"
              name="lengthMax"
              placeholder="Max"
              defaultValue={initial.lengthMax}
              onChange={(e) => debounced("lengthMax", e.target.value)}
              className={field}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-semibold text-[#0a2230]" htmlFor="currency">
              Price
            </label>
            <select
              id="currency"
              name="currency"
              defaultValue={selectedCurrency}
              onChange={(e) => setParam("currency", e.target.value)}
              className={miniSelect}
              title="Currency"
            >
              {["USD","EUR","GBP","AUD","NZD","JPY"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="priceMin"
              placeholder="Min"
              defaultValue={initial.priceMin}
              onChange={(e) => debounced("priceMin", e.target.value)}
              className={field}
            />
            <input
              type="number"
              name="priceMax"
              placeholder="Max"
              defaultValue={initial.priceMax}
              onChange={(e) => debounced("priceMax", e.target.value)}
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
      </form>
    </div>
  );
}
