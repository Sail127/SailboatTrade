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

function safeEqual(a, b) {
  const x = String(a || "");
  const y = String(b || "");
  if (!x || !y) return false;
  return x === y;
}

function parseBearer(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (!lower.startsWith("bearer ")) return "";
  return raw.slice(7).trim();
}

export function isAuthorizedCronRequest(req) {
  const expected = String(process.env.CRON_SECRET || "").trim();
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = req?.headers?.get?.("authorization");
  const bearer = parseBearer(authHeader);
  if (safeEqual(bearer, expected)) return true;

  const headerSecret = String(req?.headers?.get?.("x-cron-secret") || "").trim();
  if (safeEqual(headerSecret, expected)) return true;

  try {
    const url = new URL(req.url);
    const querySecret = String(url.searchParams.get("secret") || "").trim();
    if (safeEqual(querySecret, expected)) return true;
  } catch {}

  return false;
}

export function hasFilledHoneypot(body, field = "website") {
  const v = body?.[field];
  return String(v || "").trim().length > 0;
}

export function clampStr(v, maxLen) {
  const s = String(v || "");
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}
