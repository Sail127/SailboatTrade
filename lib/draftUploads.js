export const DRAFT_UPLOAD_TTL_MINUTES = 30;
export const DRAFT_UPLOAD_TTL_MS = DRAFT_UPLOAD_TTL_MINUTES * 60 * 1000;

export function normalizeDraftUploadKeys(keys) {
  const input = Array.isArray(keys) ? keys : [keys];
  const seen = new Set();
  const out = [];

  for (const raw of input) {
    const key = String(raw || "").trim();
    if (!key) continue;
    if (!key.startsWith("drafts/")) continue;
    if (key.includes("..") || key.startsWith("/") || key.startsWith("\\")) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }

  return out;
}

export function getDraftUploadCutoffDate(minutes = DRAFT_UPLOAD_TTL_MINUTES) {
  const safeMinutes = Math.max(1, Number(minutes) || DRAFT_UPLOAD_TTL_MINUTES);
  return new Date(Date.now() - safeMinutes * 60 * 1000);
}
