export function smartTitleCase(value) {
  const input = String(value ?? "").trim();
  if (!input) return "";

  const normalizeWord = (word) => {
    if (!word) return word;
    if (/\d/.test(word) && !/[a-z]/i.test(word)) return word;
    if (/^[A-Z]{2,4}$/.test(word)) return word;
    if (/[A-Z].*[a-z]|[a-z].*[A-Z]/.test(word)) return word;

    let next = word.toLowerCase().replace(/(^|[-/.(])([a-z])/g, (_, prefix, letter) => {
      return `${prefix}${letter.toUpperCase()}`;
    });

    next = next.replace(/(^|[\s-])mc([a-z])/g, (_, prefix, letter) => `${prefix}Mc${letter.toUpperCase()}`);
    next = next.replace(/(^|[\s-])mac([a-z])/g, (_, prefix, letter) => `${prefix}Mac${letter.toUpperCase()}`);
    next = next.replace(/(^|[\s-])o'([a-z])/g, (_, prefix, letter) => `${prefix}O'${letter.toUpperCase()}`);
    return next;
  };

  return input
    .split(/\s+/)
    .map((part) => normalizeWord(part))
    .join(" ");
}

export function normalizeListingTitle(value) {
  return smartTitleCase(value);
}

export function normalizeBuilderName(value) {
  return smartTitleCase(value);
}

export function normalizeModelName(value) {
  return smartTitleCase(value);
}

export function normalizeCityName(value) {
  return smartTitleCase(value);
}

export function normalizeStateName(value) {
  const input = String(value ?? "").trim();
  if (!input) return "";
  if (/^[A-Za-z]{2}$/.test(input)) return input.toUpperCase();
  return smartTitleCase(input);
}

export function normalizePersonName(value) {
  return smartTitleCase(value);
}

export function normalizeBusinessName(value) {
  return smartTitleCase(value);
}
