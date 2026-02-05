// components/SiteSearch.js
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SiteSearch({ size = "md" }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [query, setQuery] = useState(sp.get("q") || "");

  const base =
    "flex w-full items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-sm text-slate-100 shadow-sm focus-within:border-[#f3d08a]/80 focus-within:bg-black/20";

  const heights = {
    sm: "h-9",
    md: "h-10",
  };

  const inputClass =
    "h-full flex-1 bg-transparent text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none";

  function onSubmit(e) {
    e.preventDefault();

    const params = new URLSearchParams(sp.toString());

    if (!query.trim()) {
      params.delete("q");
    } else {
      params.set("q", query.trim());
    }

    // Reset pagination when searching
    params.delete("page");

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`${base} ${heights[size] ?? heights.md}`}
      role="search"
    >
      <input
        type="text"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={inputClass}
        placeholder="Search sailboats, models, locations…"
        aria-label="Search sailboat listings"
      />
      <button
        type="submit"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f3d08a]/95 text-[#0b1721] hover:bg-[#f9e4af] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3d08a]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1721]"
      >
        <span className="sr-only">Search</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-3.5 w-3.5"
          fill="none"
        >
          <circle
            cx="9"
            cy="9"
            r="5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M12.5 12.5L16 16"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </form>
  );
}
