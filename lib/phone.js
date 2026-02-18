import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Normalize a phone-like string to E.164.
 * - Empty string is allowed (clears phone)
 * - Returns { ok:false } if non-empty but invalid
 */
export function normalizePhoneToE164(raw) {
  const s = String(raw || "").trim();
  if (!s) return { e164: "", ok: true };

  const pn = parsePhoneNumberFromString(s);
  if (!pn) return { e164: "", ok: false };
  if (!pn.isValid()) return { e164: "", ok: false };

  return { e164: pn.number, ok: true }; // E.164
}

/**
 * Convert "US" -> "us" (react-international-phone expects lower-case iso2)
 */
export function toPhoneIso2Lower(iso2) {
  const v = String(iso2 || "").trim().toLowerCase();
  return v.length === 2 ? v : "";
}

/**
 * Best-effort default country based on browser language.
 * Safe to call client-side. Server-side returns fallback.
 */
export function guessDefaultPhoneCountry(fallback = "us") {
  if (typeof navigator === "undefined") return fallback;

  try {
    const lang = (navigator.language || "").toLowerCase();

    if (lang.includes("en-gb")) return "gb";
    if (lang.includes("en-au")) return "au";
    if (lang.includes("en-nz")) return "nz";
    if (lang.includes("fr")) return "fr";
    if (lang.includes("es")) return "es";
    if (lang.includes("it")) return "it";
    if (lang.includes("nl")) return "nl";
    if (lang.includes("sv")) return "se";
    if (lang.includes("pt")) return "pt";
    if (lang.includes("el")) return "gr";
    if (lang.includes("hr")) return "hr";
    if (lang.includes("en-ca") || lang.includes("fr-ca")) return "ca";

    return "us";
  } catch {
    return fallback;
  }
}
