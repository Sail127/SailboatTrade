// lib/searchWhere.js

// Keep in sync with your sidebar's builder list
export const KNOWN_BUILDERS = [
  "Beneteau","Jeanneau","Lagoon","Catalina","Fountaine Pajot","Dufour","Bavaria",
  "Hunter","Hanse","X-Yachts","Oyster","Hallberg-Rassy","Island Packet","J/Boats",
  "Elan","Excess","Hylas","Leopard","Bali","Nautitech",
];

// ✅ Form-first DB field name
const BUILDER_DB_FIELD = "builder";

const getOne = (obj, key) => {
  const v = obj?.[key];
  return Array.isArray(v) ? v[0] : v;
};

const toInt = (v) => {
  if (v == null || v === "") return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
};

const toNum = (v) => {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function addRange(where, field, min, max) {
  if (min == null && max == null) return;
  where[field] = where[field] || {};
  if (min != null) where[field].gte = min;
  if (max != null) where[field].lte = max;
}

export function buildWhereFromParams(searchParams = {}) {
  const now = new Date();
  const where = {
    status: "PUBLISHED",
    AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
  };

  // --- Builder (new) / Make (legacy param) -> DB field ("builder") ---
  const builderParam =
    (getOne(searchParams, "builder") ?? getOne(searchParams, "make") ?? "")
      .toString()
      .trim();

  if (builderParam) {
    if (builderParam === "Other") {
      where[BUILDER_DB_FIELD] = { notIn: KNOWN_BUILDERS };
    } else {
      where[BUILDER_DB_FIELD] = { equals: builderParam, mode: "insensitive" };
    }
  }

  // --- Hull type: DB field is "type" (MONOHULL/CATAMARAN/TRIMARAN) ---
  const typeParam = (getOne(searchParams, "type") ?? "both").toString().toUpperCase();
  if (typeParam && typeParam !== "BOTH") {
    // Accept either "MONOHULL" etc. or friendly "monohull"
    const normalized =
      typeParam === "MONOHULL" || typeParam === "CATAMARAN" || typeParam === "TRIMARAN"
        ? typeParam
        : typeParam.toLowerCase() === "monohull"
        ? "MONOHULL"
        : typeParam.toLowerCase() === "catamaran"
        ? "CATAMARAN"
        : typeParam.toLowerCase() === "trimaran"
        ? "TRIMARAN"
        : null;

    if (normalized) where.type = normalized;
  }

  // --- Country: DB field is "locationCountry" ---
  const country = (getOne(searchParams, "country") ?? "").toString().trim();
  if (country) {
    where.locationCountry = { equals: country, mode: "insensitive" };
  }

  // --- Year range ---
  addRange(where, "year", toInt(getOne(searchParams, "yearMin")), toInt(getOne(searchParams, "yearMax")));

  // --- LOA range (your form uses loa, not length) ---
  addRange(where, "loa", toNum(getOne(searchParams, "lengthMin")), toNum(getOne(searchParams, "lengthMax")));
  // If you later rename the UI params to loaMin/loaMax, also support those:
  addRange(where, "loa", toNum(getOne(searchParams, "loaMin")), toNum(getOne(searchParams, "loaMax")));

  // --- Price range ---
  addRange(where, "price", toNum(getOne(searchParams, "priceMin")), toNum(getOne(searchParams, "priceMax")));

  return where;
}
