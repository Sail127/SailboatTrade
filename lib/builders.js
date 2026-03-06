const RAW_BUILDERS = [
  "Beneteau",
  "Jeanneau",
  "Lagoon",
  "Catalina",
  "Fountaine Pajot",
  "Dufour",
  "Bavaria",
  "Hunter",
  "Hanse",
  "Sirius Yachts",
  "X-Yachts",
  "Oyster",
  "Hallberg-Rassy",
  "Island Packet",
  "J/Boats",
  "Elan",
  "Excess",
  "Hylas",
  "Leopard",
  "Bali",
  "Nautitech",
];

export const FEATURED_BUILDERS = [
  "Beneteau",
  "Jeanneau",
  "Lagoon",
  "Catalina",
  "Bavaria",
  "Fountaine Pajot",
  "Hanse",
];

export const KNOWN_BUILDERS = Array.from(new Set(RAW_BUILDERS.map((b) => String(b || "").trim()).filter(Boolean)));

export function getBuilderGroups() {
  const knownSet = new Set(KNOWN_BUILDERS);
  const popular = FEATURED_BUILDERS.filter((b) => knownSet.has(b));
  const rest = KNOWN_BUILDERS
    .filter((b) => !popular.includes(b))
    .sort((a, b) => a.localeCompare(b));

  return {
    popular,
    rest,
    all: [...popular, ...rest],
  };
}
