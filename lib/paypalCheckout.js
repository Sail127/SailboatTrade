// lib/paypalCheckout.js
export const FREE_LIMIT = 3;
export const MAX_LIMIT = 25;

const TERM_OPTIONS = new Set([1, 3, 6]);
const TERM_DISCOUNT = {
  3: 0.9,
  6: 0.8,
};

export function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function parseTermMonths(value, fallback = 1) {
  const n = Number(value);
  return TERM_OPTIONS.has(n) ? n : fallback;
}

export function discountFactor(termMonths) {
  return TERM_DISCOUNT[termMonths] || 1;
}

export function centsFromEnv(name, fallback) {
  const n = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export function computeCheckoutTotals({ photoPlus, featuredHome, termMonths }) {
  const photoPlusCents = centsFromEnv("PHOTO_PLUS_25_PRICE_USD_CENTS", 700);
  const featuredCents = centsFromEnv("FEATURED_HOME_PRICE_USD_CENTS", 700);

  const baseMonthlyCents = (photoPlus ? photoPlusCents : 0) + (featuredHome ? featuredCents : 0);
  const monthlyCents = Math.round(baseMonthlyCents * discountFactor(termMonths));
  const totalCents = monthlyCents * termMonths;

  return {
    baseMonthlyCents,
    monthlyCents,
    totalCents,
  };
}

export function dollarsFromCents(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

export function encodeCheckoutCustomId({
  listingId,
  photoPlus,
  featuredHome,
  termMonths,
}) {
  return [
    "v2",
    String(listingId || "").trim(),
    photoPlus ? "1" : "0",
    featuredHome ? "1" : "0",
    String(parseTermMonths(termMonths, 1)),
  ].join("|");
}

export function decodeCheckoutCustomId(raw) {
  const parts = String(raw || "").split("|");
  if (!parts.length) return null;

  // v1/v2 legacy formats both decode as: listingId, photoPlus, featuredHome, termMonths.
  const version = String(parts[0] || "").trim();
  if (version !== "v1" && version !== "v2") return null;

  const listingId = String(parts[1] || "").trim();
  const photoPlus = parts[2] === "1";
  const featuredHome = parts[3] === "1";
  const termMonths = parseTermMonths(parts[4], 0);

  if (!listingId) return null;
  if (!termMonths) return null;

  return {
    listingId,
    photoPlus,
    featuredHome,
    termMonths,
  };
}

export function toMinorUnits(value) {
  const n = Number.parseFloat(String(value || ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
