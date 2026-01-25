// lib/searchWhere.js

// Keep in sync with your sidebar's builder list
export const KNOWN_BUILDERS = [
  "Beneteau","Jeanneau","Lagoon","Catalina","Fountaine Pajot","Dufour","Bavaria",
  "Hunter","Hanse","X-Yachts","Oyster","Hallberg-Rassy","Island Packet","J/Boats",
  "Elan","Excess","Hylas","Leopard","Bali","Nautitech",
];

// If your DB column is already renamed to "builder", set this to "builder".
// Right now we assume your schema still uses "make".
const BUILDER_DB_FIELD = "make";

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
  const where = { status: "PUBLISHED" };

  // --- Builder (new) / Make (legacy) -> DB field (BUILDER_DB_FIELD) ---
  const builderParam =
    (getOne(searchParams, "builder") ?? getOne(searchParams, "make") ?? "")
      .toString()
      .trim();

  if (builderParam) {
    if (builderParam === "Other") {
      // anything NOT in known list
      where[BUILDER_DB_FIELD] = { notIn: KNOWN_BUILDERS };
    } else {
      // case-insensitive equality on the DB field
      where[BUILDER_DB_FIELD] = { equals: builderParam, mode: "insensitive" };
    }
  }

  // --- Hull type ("type": both|monohull|catamaran|trimaran) ---
  const type = (getOne(searchParams, "type") ?? "both").toString().toLowerCase();
  if (type && type !== "both") {
    // Adjust field name below to match your schema (e.g., "hullType" or "type")
    where.hullType = { equals: type, mode: "insensitive" };
  }

  // --- Country ---
  const country = (getOne(searchParams, "country") ?? "").toString().trim();
  if (country) {
    // Adjust field name if your schema uses e.g. "locationCountry"
    where.locationCountry = { equals: country, mode: "insensitive" };
  }

  // --- Year range ---
  addRange(where, "year", toInt(getOne(searchParams, "yearMin")), toInt(getOne(searchParams, "yearMax")));

  // --- Length range ---
  addRange(where, "length", toNum(getOne(searchParams, "lengthMin")), toNum(getOne(searchParams, "lengthMax")));

  // --- Price range ---
  addRange(where, "price", toNum(getOne(searchParams, "priceMin")), toNum(getOne(searchParams, "priceMax")));

  return where;
}
