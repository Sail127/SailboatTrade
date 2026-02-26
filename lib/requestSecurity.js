export function isTrustedOrigin(req) {
  const origin = String(req?.headers?.get?.("origin") || "").trim();
  if (!origin) return true;

  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  const forwardedHost = String(req?.headers?.get?.("x-forwarded-host") || "").trim();
  const host = forwardedHost || String(req?.headers?.get?.("host") || "").trim();
  if (!host) return false;

  return originUrl.host.toLowerCase() === host.toLowerCase();
}

export function hasFilledHoneypot(body, field = "website") {
  const v = body?.[field];
  return String(v || "").trim().length > 0;
}

export function clampStr(v, maxLen) {
  const s = String(v || "");
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}
