// components/ResultsPerPage.js
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const ALLOWED = [12, 18, 24, 36, 48];
const DEFAULT = 24;

export default function ResultsPerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const raw = parseInt(sp.get("perPage") || "", 10);
  const current = ALLOWED.includes(raw) ? raw : DEFAULT;

  function setPerPage(next) {
    const params = new URLSearchParams(sp.toString());

    if (!next || next === DEFAULT) params.delete("perPage");
    else params.set("perPage", String(next));

    params.delete("page");

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const labelClass =
    "block text-[11px] font-semibold tracking-wide text-[#0a2230]/70 mb-1";

  // Tight: just wide enough for numbers + caret
  const selectClass =
    "h-9 w-[88px] rounded-full border border-slate-300 bg-white px-3 text-sm text-[#0a2230] " +
    "shadow-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

  return (
    <div className="w-[88px]">
      <label className={labelClass} htmlFor="perPage">
        RESULTS SHOWN
      </label>
      <select
        id="perPage"
        value={current}
        onChange={(e) => setPerPage(parseInt(e.target.value, 10))}
        className={selectClass}
      >
        {ALLOWED.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}
