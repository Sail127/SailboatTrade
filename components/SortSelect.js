// components/SortSelect.js
"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "updated_desc", label: "Listing Date: New to Old" },
  { value: "updated_asc", label: "Listing Date: Old to New" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "length_asc", label: "Length: Short to Long" },
  { value: "length_desc", label: "Length: Long to Short" },
  { value: "year_desc", label: "Year: Newest" },
  { value: "year_asc", label: "Year: Oldest" },
  { value: "builder_asc", label: "Builder: A to Z" },
];

export default function SortSelect() {
  const router = useRouter();
  const sp = useSearchParams();
  const current = sp.get("sort") || "updated_desc";

  function setSort(next) {
    const params = new URLSearchParams(sp.toString());
    if (!next || next === "updated_desc") params.delete("sort");
    else params.set("sort", next);

    params.delete("page");
    router.push(`/listings?${params.toString()}`);
  }

  const labelClass =
    "block text-[11px] font-semibold tracking-wide text-[#0a2230]/70 mb-1";

  const selectClass =
    "h-9 w-[260px] rounded-full border border-slate-300 bg-white px-3 text-sm text-[#0a2230] " +
    "shadow-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

  return (
    <div className="w-[260px]">
      <label className={labelClass} htmlFor="sort">
        SORT BY
      </label>
      <select
        id="sort"
        value={current}
        onChange={(e) => setSort(e.target.value)}
        className={selectClass}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
