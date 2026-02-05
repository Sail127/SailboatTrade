// components/FiltersMobile.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import FilterSidebar from "./FilterSidebar";

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

function computeActiveFilterCount(sp) {
  if (!sp) return 0;

  const get = (k) => (sp.get(k) ?? "").toString().trim();
  const has = (k) => !!get(k);

  let count = 0;

  // Ignore these completely
  // page/sort/perPage are controls, not filters
  // (we simply never count them)

  // Keyword
  if (has("q")) count += 1;

  // Hull type (ignore default)
  const type = get("type").toLowerCase();
  if (type && type !== "both") count += 1;

  // Builder
  if (has("builder")) count += 1;

  // Country
  const countryRaw = get("country");
  const country = normalizeCountry(countryRaw);
  if (country) count += 1;

  // USA Region only counts if country is USA
  if (country === "United States" && has("usRegion")) count += 1;

  // Year group
  if (has("yearMin") || has("yearMax")) count += 1;

  // Length group (unit doesn't count unless length is used)
  if (has("lengthMin") || has("lengthMax")) count += 1;

  // Price group (currency doesn't count unless price is used)
  if (has("priceMin") || has("priceMax")) count += 1;

  return count;
}

export default function FiltersMobile({ initial, countries }) {
  const [open, setOpen] = useState(false);
  const sp = useSearchParams();

  const activeCount = useMemo(() => computeActiveFilterCount(sp), [sp]);

  // Prevent body scroll when open (nice on mobile)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const pillBtn =
    "inline-flex items-center gap-2 h-9 rounded-full px-4 text-sm font-semibold " +
    "border border-slate-300 bg-white text-[#0a2230] shadow-sm " +
    "hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

  const badge =
    "inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 " +
    "rounded-full text-[12px] font-extrabold " +
    "bg-[#0a2230] text-white ring-2 ring-[#c8a44d]";

  const smallPill =
    "h-9 rounded-full px-4 text-sm font-semibold " +
    "border border-slate-300 bg-white text-[#0a2230] shadow-sm " +
    "hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

  const resetPill =
    "h-9 rounded-full px-4 text-sm font-semibold " +
    "border border-slate-300 bg-white text-[#0a2230]/80 shadow-sm " +
    "hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={pillBtn}>
        Filters
        {activeCount > 0 && <span className={badge}>{activeCount}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[#0a2230] font-semibold text-base">
                    Filters
                  </h3>
                  {activeCount > 0 && <span className={badge}>{activeCount}</span>}
                </div>

                <div className="flex items-center gap-2">
                  {/* Reset = just go to /listings (same as desktop Reset) */}
                  <a href="/listings" className={resetPill} onClick={() => setOpen(false)}>
                    Reset
                  </a>

                  <button
                    type="button"
                    className={smallPill}
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="mt-3 h-px bg-slate-200" />
            </div>

            {/* Content */}
            <div className="px-4 pb-6 flex-1 overflow-auto overscroll-contain">
              <FilterSidebar initial={initial} countries={countries} inDrawer />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
