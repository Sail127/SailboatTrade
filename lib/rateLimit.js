const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 60_000;

function getStore() {
  if (!globalThis.__sbtRateLimitStore) {
    globalThis.__sbtRateLimitStore = new Map();
  }
  return globalThis.__sbtRateLimitStore;
}

function nowMs() {
  return Date.now();
}

function cleanupExpired(store, t) {
  for (const [k, v] of store.entries()) {
    if (!v || typeof v.resetAt !== "number" || v.resetAt <= t) {
      store.delete(k);
    }
  }
}

export function getClientIp(req) {
  const xff = String(req?.headers?.get?.("x-forwarded-for") || "").trim();
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const xrip = String(req?.headers?.get?.("x-real-ip") || "").trim();
  if (xrip) return xrip;

  const cfip = String(req?.headers?.get?.("cf-connecting-ip") || "").trim();
  if (cfip) return cfip;

  return "unknown";
}

export function makeRateLimitKey(req, scope, identifier = "") {
  const ip = getClientIp(req);
  const s = String(scope || "global").trim().toLowerCase();
  const id = String(identifier || "").trim().toLowerCase();
  return id ? `${s}:${ip}:${id}` : `${s}:${ip}`;
}

export function rateLimit({ key, limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS }) {
  const store = getStore();
  const t = nowMs();

  if (store.size > 10_000) cleanupExpired(store, t);

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT;
  const safeWindow = Number.isFinite(windowMs) && windowMs > 0 ? Math.floor(windowMs) : DEFAULT_WINDOW_MS;
  const k = String(key || "global:unknown");

  const cur = store.get(k);
  if (!cur || cur.resetAt <= t) {
    const next = { count: 1, resetAt: t + safeWindow };
    store.set(k, next);
    return {
      ok: true,
      limit: safeLimit,
      remaining: Math.max(0, safeLimit - next.count),
      retryAfterSec: Math.ceil(safeWindow / 1000),
      resetAt: next.resetAt,
    };
  }

  if (cur.count >= safeLimit) {
    return {
      ok: false,
      limit: safeLimit,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - t) / 1000)),
      resetAt: cur.resetAt,
    };
  }

  cur.count += 1;
  store.set(k, cur);

  return {
    ok: true,
    limit: safeLimit,
    remaining: Math.max(0, safeLimit - cur.count),
    retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - t) / 1000)),
    resetAt: cur.resetAt,
  };
}
