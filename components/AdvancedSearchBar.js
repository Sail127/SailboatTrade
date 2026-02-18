// components/AdvancedSearchBar.js
"use client";

import { useMemo, useState } from "react";
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

function buildLoaSuggestions(unit) {
  // Simple “common picks” while still allowing typing
  if (unit === "m") {
    return ["6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "18", "20", "22", "24"];
  }
  // ft
  return ["20", "22", "25", "27", "30", "32", "35", "37", "40", "42", "45", "50", "55", "60", "65", "70", "75"];
}

/** Small inline FT/M toggle */
function SmallUnitToggle({ value, onChange }) {
  const btn = "px-1.5 py-[1px] rounded-md text-[11px] font-semibold transition";
  return (
    <span className="inline-flex items-center gap-1 ml-2 align-middle">
      <button
        type="button"
        onClick={() => onChange("ft")}
        className={[
          btn,
          value === "ft"
            ? "bg-white text-[#0a2230]"
            : "bg-white/10 text-white/75 hover:text-white hover:bg-white/15",
        ].join(" ")}
        aria-pressed={value === "ft"}
      >
        FT
      </button>
      <button
        type="button"
        onClick={() => onChange("m")}
        className={[
          btn,
          value === "m"
            ? "bg-white text-[#0a2230]"
            : "bg-white/10 text-white/75 hover:text-white hover:bg-white/15",
        ].join(" ")}
        aria-pressed={value === "m"}
      >
        M
      </button>
    </span>
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
          active ? "bg-[#c8a44d] opacity-100" : "bg-transparent opacity-0",
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

export default function AdvancedSearchBar({ variant = "dark" }) {
  const router = useRouter();

  const builders = useMemo(orderBuilders, []);
  const yearOptions = useMemo(buildYearOptions, []);
  const countryOptions = useMemo(buildCountryOptionsForSearch, []);

  const [q, setQ] = useState("");
  const [type, setType] = useState("both"); // ALL
  const [builder, setBuilder] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [loaUnit, setLoaUnit] = useState("ft");
  const [loaMin, setLoaMin] = useState("");
  const [loaMax, setLoaMax] = useState("");
  const [country, setCountry] = useState(""); // ✅ ISO alpha-2 or ""
  const [usRegion, setUsRegion] = useState("");

  const isUSA = String(country || "").toUpperCase() === "US";
  const loaSuggestions = useMemo(() => buildLoaSuggestions(loaUnit), [loaUnit]);

  const shell = "w-full rounded-2xl bg-[#0a2230] p-5 shadow-lg ring-1 ring-white/15";

  const label = "block text-[12px] font-semibold tracking-wide text-white/80";

  // ✅ Force white inputs regardless of globals.css
  const input =
    "h-10 w-full rounded-full border border-white/20 px-3 text-sm outline-none " +
    "!bg-white !text-[#0a2230] placeholder:!text-slate-400 " +
    "focus:border-[#c8a44d]/60 focus:ring-2 focus:ring-[#c8a44d]/30";

  const select =
    "h-10 w-full rounded-full border border-white/20 px-3 text-sm outline-none " +
    "!bg-white !text-[#0a2230] " +
    "focus:border-[#c8a44d]/60 focus:ring-2 focus:ring-[#c8a44d]/30";

  const button =
    "h-10 rounded-full bg-[#f3b23f] px-6 text-sm font-semibold text-black " +
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

    put("loaUnit", loaUnit);
    put("loaMin", loaMin);
    put("loaMax", loaMax);

    // ✅ Country is ISO alpha-2 (matches your listing form + DB)
    if (country) params.set("country", String(country).toUpperCase());
    else params.delete("country");

    // ✅ Only allow usRegion when country is US
    if (isUSA) put("usRegion", usRegion);
    else params.delete("usRegion");

    params.delete("page");

    const qs = params.toString();
    router.push(qs ? `/listings?${qs}` : "/listings");
  };

  return (
    <section className="w-full">
      <form onSubmit={submit} className={shell}>
        {/* datalists: typing OR picking */}
        <datalist id="st-year-options">
          {yearOptions.map((y) => (
            <option key={y} value={y} />
          ))}
        </datalist>

        <datalist id={`st-loa-${loaUnit}`}>
          {loaSuggestions.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>

        {/* ROW 1: Keyword + Year + Builder + Search */}
        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-12 md:col-span-4 min-w-0">
            <label className={label}>Keyword search</label>
            <input
              type="text"
              placeholder="Builder, model, city, region…"
              className={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-3 min-w-0">
            <label className={label}>Year</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <input
                type="text"
                inputMode="numeric"
                list="st-year-options"
                placeholder="Min"
                className={input}
                value={yearMin}
                onChange={(e) => setYearMin(e.target.value)}
              />
              <input
                type="text"
                inputMode="numeric"
                list="st-year-options"
                placeholder="Max"
                className={input}
                value={yearMax}
                onChange={(e) => setYearMax(e.target.value)}
              />
            </div>
          </div>

          {/* ✅ Builder less wide + min-w-0 so it won’t overflow */}
          <div className="col-span-12 md:col-span-3 min-w-0">
            <label className={label}>Builder</label>
            <select className={select} value={builder} onChange={(e) => setBuilder(e.target.value)}>
              <option value="">All</option>
              {builders.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>

          {/* ✅ Give the button more space so nothing tucks under it */}
          <div className="col-span-12 md:col-span-2 md:flex md:justify-end">
            <button type="submit" className={`${button} w-full md:w-auto`}>
              Search
            </button>
          </div>
        </div>

{/* ROW 2: Hull + LOA + Country/Region */}
<div className="mt-4 grid grid-cols-12 gap-3 items-end">
  {/* Hull type */}
  <div className="col-span-12 lg:col-span-4">
    <div className={label}>Hull type</div>
    <div className="mt-2 flex flex-wrap gap-2">
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
    </div>
  </div>

  {/* ✅ LOA (narrower + matches Year width) */}
  <div className="col-span-12 sm:col-span-6 lg:col-span-3 min-w-0">
    <div className="flex items-center justify-between">
      <label className={label}>
        LOA <span className="text-white/55 font-semibold">(length overall)</span>
        <SmallUnitToggle value={loaUnit} onChange={setLoaUnit} />
      </label>
      <span />
    </div>

    <div className="mt-2 grid grid-cols-2 gap-2">
      <input
        type="text"
        inputMode="decimal"
        list={`st-loa-${loaUnit}`}
        placeholder="Min Length"
        className={input}
        value={loaMin}
        onChange={(e) => setLoaMin(e.target.value)}
      />
      <input
        type="text"
        inputMode="decimal"
        list={`st-loa-${loaUnit}`}
        placeholder="Max Length"
        className={input}
        value={loaMax}
        onChange={(e) => setLoaMax(e.target.value)}
      />
    </div>
  </div>

  {/* ✅ Country / USA Region (wider so Region fits naturally) */}
  <div className="col-span-12 sm:col-span-6 lg:col-span-5 min-w-0">
    <label className={label}>{isUSA ? "Country / USA Region" : "Country"}</label>

    {!isUSA ? (
      <div className="mt-2">
        <select
          className={select}
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
    ) : (
      <div className="mt-2 flex gap-2">
        <select
          className={`${select} flex-1 min-w-0`}
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

        <select
          className={`${select} flex-1 min-w-0`}
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
      </div>
    )}
  </div>
</div>
      </form>
    </section>
  );
}
