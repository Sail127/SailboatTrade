// lib/formStyles.js
export const NAVY = "#0a2230";
export const GOLD = "#c8a44d";

export const helpText = "text-[11px] text-slate-600 mt-1";
export const labelBase = "block text-[13px] font-semibold text-[#0a2230] mb-1.5";

export const fieldBase =
  "w-full h-10 rounded-xl border px-3 text-[13px] text-[#0a2230] " +
  "outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

export const fieldSmall =
  "h-10 rounded-xl border px-3 text-[13px] text-[#0a2230] " +
  "outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

export const textareaBase =
  "w-full min-h-[190px] rounded-xl border px-3 py-2.5 text-[13px] text-[#0a2230] " +
  "outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

export const btnPrimary =
  "inline-flex h-10 items-center justify-center rounded-full px-6 text-[13px] font-semibold " +
  "bg-[#0a2230] text-white hover:bg-[#0f2a3b] transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a44d]/50";

export const btnGhost =
  "inline-flex h-10 items-center justify-center rounded-full px-6 text-[13px] font-semibold " +
  "border border-slate-300 text-[#0a2230] hover:bg-slate-50 transition";

export const btnMini =
  "inline-flex h-8 items-center justify-center rounded-full px-3 text-[12px] font-semibold " +
  "border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50 transition " +
  "focus:outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

export const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 " +
  "bg-white text-[#0a2230] hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

export function fieldBorder(bad) {
  return bad
    ? "border-red-300 bg-red-50 focus:ring-red-200"
    : "border-slate-300 bg-white";
}

// Option A: pass touched+missing (exactly like your form already computes)
export function makeFieldHelpers({ touched = {}, missing = {} }) {
  const showErrorFor = (key) => Boolean(touched?.[key] && missing?.[key]);

  const label = (key) => `${labelBase} ${showErrorFor(key) ? "text-red-700" : ""}`;
  const input = (key) => `${fieldBase} ${fieldBorder(showErrorFor(key))}`;
  const inputSm = (key) => `${fieldSmall} ${fieldBorder(showErrorFor(key))}`;
  const textarea = (key) => `${textareaBase} ${fieldBorder(showErrorFor(key))}`;

  return { showErrorFor, label, input, inputSm, textarea };
}
