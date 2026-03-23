// components/SortSelect.js
"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "updated_desc", label: "Listing Date: New to Old" },
  { value: "updated_asc", label: "Listing Date: Old to New" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "loa_asc", label: "Length: Short to Long" },
  { value: "loa_desc", label: "Length: Long to Short" },
  { value: "year_desc", label: "Year: Newest" },
  { value: "year_asc", label: "Year: Oldest" },
  { value: "builder_asc", label: "Builder: A to Z" },
];
import { usePathname } from "next/navigation";

export default function SortSelect() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const current = sp.get("sort") || "updated_desc";

  function setSort(next) {
    const params = new URLSearchParams(sp.toString());
    if (!next || next === "updated_desc") params.delete("sort");
    else params.set("sort", next);

    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const labelClass =
    "mb-1 block text-[11px] font-semibold tracking-wide text-[#0a2230]/70";

  const selectClass =
    "h-9 w-[260px] rounded-md border border-slate-300 bg-white px-3 text-sm text-[#0a2230] " +
    "outline-none focus:ring-2 focus:ring-[#c8a44d]/35";

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
