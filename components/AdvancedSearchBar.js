// components/AdvancedSearchBar.js
"use client";

import { useRouter } from "next/navigation";
import { useRef, useMemo, useState } from "react";

const RAW_BUILDERS = [
  "Beneteau","Jeanneau","Lagoon","Catalina","Fountaine Pajot","Dufour","Bavaria",
  "Hunter","Hanse","X-Yachts","Oyster","Hallberg-Rassy","Island Packet","J/Boats",
  "Elan","Excess","Hylas","Leopard","Bali","Nautitech",
];
const TOP5 = ["Beneteau", "Jeanneau", "Lagoon", "Catalina", "Bavaria"];

function orderBuilders() {
  const set = new Set(RAW_BUILDERS.map((m) => m.trim()));
  const deduped = Array.from(set);
  const rest = deduped.filter((m) => !TOP5.includes(m)).sort();
  return [...TOP5, ...rest];
}

function SmallToggleInline({ value, onChange, variant = "light" }) {
  const isDark = variant === "dark";

  const base =
    "text-[11px] font-semibold tracking-wide px-1.5 py-0.5 rounded transition";

  const active = isDark
    ? "text-[#0a2230] bg-white"
    : "text-[#0a2230] bg-slate-200";

  const inactive = isDark
    ? "text-white/70 hover:text-white hover:bg-white/10"
    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100";

  return (
    <span className="inline-flex items-center gap-1 ml-2">
      <button
        type="button"
        onClick={() => onChange("ft")}
        aria-pressed={value === "ft"}
        className={`${base} ${value === "ft" ? active : inactive}`}
      >
        FT
      </button>
      <button
        type="button"
        onClick={() => onChange("m")}
        aria-pressed={value === "m"}
        className={`${base} ${value === "m" ? active : inactive}`}
      >
        M
      </button>
    </span>
  );
}

export default function AdvancedSearchBar({ variant = "light" }) {
  const router = useRouter();
  const formRef = useRef(null);
  const builders = useMemo(orderBuilders, []);

  const isDark = variant === "dark";

  const [lengthUnit, setLengthUnit] = useState("ft");
  const [currency, setCurrency] = useState("USD");

  const handleSubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const [key, val] of f.entries()) {
      if (val) params.set(key, val);
    }
    router.push(`/listings?${params.toString()}`);
  };

  // Theme classes
  const formClass = isDark
    ? "w-full rounded-2xl bg-[#0a2230] p-5 shadow-lg ring-1 ring-white/15"
    : "w-full rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200";

  const labelClass = isDark
    ? "block text-xs font-medium text-white/80"
    : "block text-xs font-medium text-slate-700";

  // White pill border + dark field background
  const fieldClass = isDark
    ? "mt-1 h-10 w-full rounded-full border border-white/25 bg-[#071523] px-3 text-sm text-white placeholder:text-white/45 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10"
    : "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900";

  const selectClass = isDark
    ? "mt-1 h-10 w-full rounded-full border border-white/25 bg-[#071523] px-3 text-sm text-white outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10"
    : "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900";

  const halfFieldClass = isDark
    ? "h-10 w-1/2 rounded-full border border-white/25 bg-[#071523] px-3 text-sm text-white placeholder:text-white/45 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10"
    : "h-10 w-1/2 rounded-md border border-slate-300 px-2 text-sm text-slate-900";

  const currencyTextClass = isDark
    ? "text-xs font-semibold text-white underline underline-offset-2 decoration-white/60"
    : "text-xs font-medium text-slate-700 underline underline-offset-2";

  // Button (kept identical styling to yours)
  const buttonClass =
    "h-10 rounded-full bg-[#f3b23f] px-6 text-sm font-semibold text-black " +
    "hover:bg-[#f9c860] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3b23f]";

  return (
    <section className="w-full">
      <form ref={formRef} onSubmit={handleSubmit} className={formClass}>
        {/* ✅ LINE 1: Keyword + Search button side-by-side */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-center">
          <div className="w-full sm:max-w-xl">
            <label className={labelClass}>Keyword search</label>
            <input
              type="text"
              name="q"
              placeholder="Builder, model, region…"
              className={fieldClass}
            />
          </div>

          <div className="sm:pb-[1px]">
            <button type="submit" className={buttonClass}>
              Search
            </button>
          </div>
        </div>

        {/* ✅ LINE 2: All filters in one tight row (desktop) */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6 lg:grid-cols-12 lg:gap-3 items-end">
          {/* Hull Type (tight) */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-2">
            <label htmlFor="type" className={labelClass}>
              Hull Type
            </label>
            <select id="type" name="type" defaultValue="" className={selectClass}>
              <option value="">All</option>
              <option value="monohull">Monohull</option>
              <option value="catamaran">Catamaran</option>
              <option value="trimaran">Trimaran</option>
            </select>
          </div>

          {/* Builder (tight) */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-2">
            <label htmlFor="builder" className={labelClass}>
              Builder
            </label>
            <select id="builder" name="builder" defaultValue="" className={selectClass}>
              <option value="">All</option>
              {builders.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Year (min/max) */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-2">
            <label className={labelClass}>Year</label>
            <div className="mt-1 flex gap-2">
              <input type="number" name="yearMin" placeholder="Min" className={halfFieldClass} />
              <input type="number" name="yearMax" placeholder="Max" className={halfFieldClass} />
            </div>
          </div>

          {/* Length (min/max + unit toggle) */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-3">
            <label className={labelClass}>
              Length
              <SmallToggleInline
                value={lengthUnit}
                onChange={setLengthUnit}
                variant={variant}
              />
            </label>
            <input type="hidden" name="lengthUnit" value={lengthUnit} />
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                name="lengthMin"
                placeholder="Min"
                className={halfFieldClass}
              />
              <input
                type="number"
                name="lengthMax"
                placeholder="Max"
                className={halfFieldClass}
              />
            </div>
          </div>

          {/* Price (min/max + currency) */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-3">
            <label className={labelClass}>
              Price{" "}
              <span className="relative inline-block ml-2 align-middle">
                <span className={currencyTextClass}>{currency}</span>
                <select
                  name="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label="Currency"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AUD">AUD</option>
                  <option value="NZD">NZD</option>
                  <option value="JPY">JPY</option>
                </select>
              </span>
            </label>

            <div className="mt-1 flex gap-2">
              <input type="number" name="priceMin" placeholder="Min" className={halfFieldClass} />
              <input type="number" name="priceMax" placeholder="Max" className={halfFieldClass} />
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
