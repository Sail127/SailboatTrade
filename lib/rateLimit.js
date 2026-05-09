import prisma from "@/lib/prisma";

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 60_000;
const MAX_KEY_LEN = 180;

function nowMs() {
  return Date.now();
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
  const raw = id ? `${s}:${ip}:${id}` : `${s}:${ip}`;
  return raw.length > MAX_KEY_LEN ? raw.slice(0, MAX_KEY_LEN) : raw;
}

async function maybeCleanupExpiredRows() {
  if (Math.random() > 0.01) return;
  try {
    await prisma.rateLimitBucket.deleteMany({
      where: { resetAt: { lt: new Date() } },
    });
  } catch {
    // cleanup is best-effort
  }
}

export async function rateLimit({ key, limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS }) {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT;
  const safeWindow = Number.isFinite(windowMs) && windowMs > 0 ? Math.floor(windowMs) : DEFAULT_WINDOW_MS;
  const k = String(key || "global:unknown");
  const nextReset = new Date(nowMs() + safeWindow);

  const rows = await prisma.$queryRaw`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "createdAt", "updatedAt")
    VALUES (${k}, 1, ${nextReset}, NOW(), NOW())
    ON CONFLICT ("key")
    DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${nextReset}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING "count", "resetAt";
  `;

  const row = Array.isArray(rows) ? rows[0] : null;
  const count = Number(row?.count || 0);
  const resetAtMs = row?.resetAt ? new Date(row.resetAt).getTime() : nowMs() + safeWindow;
  const retryAfterSec = Math.max(1, Math.ceil((resetAtMs - nowMs()) / 1000));

  void maybeCleanupExpiredRows();

  if (count > safeLimit) {
    return {
      ok: false,
      limit: safeLimit,
      remaining: 0,
      retryAfterSec,
      resetAt: resetAtMs,
    };
  }

  return {
    ok: true,
    limit: safeLimit,
    remaining: Math.max(0, safeLimit - count),
    retryAfterSec,
    resetAt: resetAtMs,
  };
}
