// components/FiltersMobile.js
"use client";

import { useEffect, useState } from "react";
import FilterSidebar from "./FilterSidebar";

export default function FiltersMobile({ initial, countries }) {
  const [open, setOpen] = useState(false);

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

  const smallPill =
    "h-9 rounded-full px-4 text-sm font-semibold " +
    "border border-slate-300 bg-white text-[#0a2230] shadow-sm " +
    "hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={pillBtn}>
        Filters
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
          <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm bg-white shadow-2xl">
            {/* Header */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[#0a2230] font-semibold text-base">
                  Filters
                </h3>
                <button type="button" className={smallPill} onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>

              <div className="mt-3 h-px bg-slate-200" />
            </div>

            {/* Content */}
            <div className="px-4 pb-6 overflow-auto h-[calc(100%-72px)]">
              <FilterSidebar initial={initial} countries={countries} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
