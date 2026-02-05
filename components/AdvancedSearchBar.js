// components/AdvancedSearchBar.js
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const RAW_BUILDERS = [
  "Beneteau","Jeanneau","Lagoon","Catalina","Fountaine Pajot","Dufour","Bavaria",
  "Hunter","Hanse","X-Yachts","Oyster","Hallberg-Rassy","Island Packet","J/Boats",
  "Elan","Excess","Hylas","Leopard","Bali","Nautitech",
];
const TOP5 = ["Beneteau", "Jeanneau", "Lagoon", "Catalina", "Bavaria"];

const POPULAR_COUNTRIES = [
  { label: "All", value: "" },
  { label: "USA", value: "United States" },
  { label: "Canada", value: "Canada" },
  { label: "United Kingdom", value: "United Kingdom" },
  { label: "France", value: "France" },
  { label: "Italy", value: "Italy" },
  { label: "Spain", value: "Spain" },
  { label: "Greece", value: "Greece" },
  { label: "Croatia", value: "Croatia" },
  { label: "Australia", value: "Australia" },
  { label: "New Zealand", value: "New Zealand" },
  { label: "Netherlands", value: "Netherlands" },
  { label: "Sweden", value: "Sweden" },
  { label: "Portugal", value: "Portugal" },
];

const US_REGION_OPTIONS = [
  { label: "All USA regions", value: "" },
  { label: "West Coast", value: "WEST_COAST" },
  { label: "East Coast", value: "EAST_COAST" },
  { label: "Gulf Coast", value: "GULF_COAST" },
  { label: "Great Lakes", value: "GREAT_LAKES" },
  { label: "Other Inland waters", value: "OTHER_INLAND_WATERS" },
];

function orderBuilders() {
  const set = new Set(RAW_BUILDERS.map((m) => m.trim()));
  const deduped = Array.from(set);
  const rest = deduped.filter((m) => !TOP5.includes(m)).sort((a, b) => a.localeCompare(b));
  return [...TOP5, ...rest];
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

/** Small inline FT/M toggle (same size as label) */
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
  // ↓ reduce border/padding/size ~15% vs the prior tiles
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
      {/* subtle gold underline when active */}
      <span
        className={[
          "absolute left-2 right-2 bottom-1 h-[2px] rounded-full transition",
          active ? "bg-[#c8a44d] opacity-100" : "bg-transparent opacity-0",
        ].join(" ")}
        aria-hidden="true"
      />

      {isAll ? (
        // ✅ center ALL vertically, no duplicate label
        <div className="h-full w-full flex items-center justify-center">
          <span className="text-white font-extrabold tracking-wide text-[13px] leading-none">
            ALL
          </span>
        </div>
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center">
          {/* ✅ PNG fills tile width nearly completely */}
          <img
            src={imgSrc}
            alt=""
            draggable={false}
            className="w-[88%] h-[28px] object-contain opacity-95"
          />
          <span className="mt-1 text-[10px] font-semibold text-white/80 leading-none">
            {label}
          </span>
        </div>
      )}
    </button>
  );
}

export default function AdvancedSearchBar({ variant = "dark" }) {
  const router = useRouter();
  const builders = useMemo(orderBuilders, []);
  const isDark = variant === "dark";

  const [q, setQ] = useState("");
  const [type, setType] = useState("both"); // default ALL
  const [builder, setBuilder] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [loaUnit, setLoaUnit] = useState("ft");
  const [loaMin, setLoaMin] = useState("");
  const [loaMax, setLoaMax] = useState("");
  const [country, setCountry] = useState("");
  const [usRegion, setUsRegion] = useState("");

  const countryNorm = normalizeCountry(country);
  const isUSA = countryNorm === "United States";

  const shell =
    "w-full rounded-2xl bg-[#0a2230] p-5 shadow-lg ring-1 ring-white/15";

  // ✅ labels a bit bigger
  const label =
    "block text-[12px] font-semibold tracking-wide text-white/80";

  const input =
    "h-10 w-full rounded-full border border-white/25 bg-[#071523] px-3 text-sm text-white placeholder:text-white/45 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10";

  const select =
    "h-10 w-full rounded-full border border-white/25 bg-[#071523] px-3 text-sm text-white outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10";

  const button =
    "h-10 rounded-full bg-[#f3b23f] px-6 text-sm font-semibold text-black hover:bg-[#f9c860] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3b23f]";

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

    // Your listings page can map these to whatever it expects
    put("loaUnit", loaUnit);
    put("loaMin", loaMin);
    put("loaMax", loaMax);

    const c = normalizeCountry(country);
    if (c) params.set("country", c);
    if (c === "United States") put("usRegion", usRegion);
    else params.delete("usRegion");

    params.delete("page");

    const qs = params.toString();
    router.push(qs ? `/listings?${qs}` : "/listings");
  };

  return (
    <section className="w-full">
      <form onSubmit={submit} className={shell}>
        {/* ROW 1: Keyword (narrower) + Year (between) + Builder + Search */}
        <div className="grid grid-cols-12 gap-3 items-end">
          {/* ✅ keyword reduced width by ~50% on desktop via col-span */}
          <div className="col-span-12 md:col-span-4">
            <label className={label}>Keyword search</label>
            <input
              type="text"
              placeholder="Builder, model, city, region…"
              className={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* ✅ move year between keyword and builder (top row) */}
          <div className="col-span-12 md:col-span-3">
            <label className={label}>Year</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                className={input}
                value={yearMin}
                onChange={(e) => setYearMin(e.target.value)}
              />
              <input
                type="number"
                placeholder="Max"
                className={input}
                value={yearMax}
                onChange={(e) => setYearMax(e.target.value)}
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className={label}>Builder</label>
            <select
              className={select}
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

          <div className="col-span-12 md:col-span-1 md:flex md:justify-end">
            <button type="submit" className={button}>
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
              <HullTile
                active={type === "both"}
                onClick={() => setType("both")}
                label="All"
                isAll
              />
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

          {/* LOA */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <div className="flex items-center justify-between">
              <label className={label}>
                LOA <span className="text-white/55 font-semibold">(length overall)</span>
                <SmallUnitToggle value={loaUnit} onChange={setLoaUnit} />
              </label>
              <span />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                className={input}
                value={loaMin}
                onChange={(e) => setLoaMin(e.target.value)}
              />
              <input
                type="number"
                placeholder="Max"
                className={input}
                value={loaMax}
                onChange={(e) => setLoaMax(e.target.value)}
              />
            </div>
          </div>

          {/* Country / USA Region */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <label className={label}>{isUSA ? "Country / Region" : "Country"}</label>

            <div className="mt-2 flex gap-2">
              <select
                className={select}
                value={country}
                onChange={(e) => {
                  const next = e.target.value;
                  setCountry(next);
                  if (normalizeCountry(next) !== "United States") setUsRegion("");
                }}
                style={{ width: isUSA ? "55%" : "100%" }}
              >
                {POPULAR_COUNTRIES.map((c) => (
                  <option key={c.label} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              {isUSA && (
                <select
                  className={select}
                  value={usRegion}
                  onChange={(e) => setUsRegion(e.target.value)}
                  style={{ width: "45%" }}
                  aria-label="USA Region"
                >
                  {US_REGION_OPTIONS.map((o) => (
                    <option key={o.value || "all"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
