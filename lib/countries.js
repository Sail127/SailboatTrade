// lib/countries.js
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

const DEFAULT_PRIORITY = ["US", "CA", "GB", "AU", "NZ"];

export function getCountryOptions(locale = "en", priority = DEFAULT_PRIORITY) {
  // If you pass a locale that isn't registered, fall back to "en"
  let names = countries.getNames(locale, { select: "official" });
  if (!names || typeof names !== "object") {
    names = countries.getNames("en", { select: "official" }) || {};
  }

  // Convert { US: "United States of America", ... } to sorted options
  const opts = Object.entries(names)
    .map(([code, label]) => ({
      value: String(code || "").toUpperCase(),
      label: String(label || "").trim(),
    }))
    .filter((o) => o.value && o.label)
    .sort((a, b) => a.label.localeCompare(b.label));

  const pr = (Array.isArray(priority) ? priority : DEFAULT_PRIORITY).map((c) =>
    String(c || "").toUpperCase()
  );

  // Put priority countries on top without duplicates
  const top = [];
  const seen = new Set();

  for (const code of pr) {
    const found = opts.find((o) => o.value === code);
    if (found && !seen.has(found.value)) {
      top.push(found);
      seen.add(found.value);
    }
  }

  const rest = opts.filter((o) => !seen.has(o.value));

  return [{ value: "", label: "Select…" }, ...top, ...rest];
}
