// app/api/account/profile/route.js
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const US_REGION_VALUES = new Set([
  "WEST_COAST",
  "EAST_COAST",
  "GULF_COAST",
  "GREAT_LAKES",
  "HAWAII",
  "OTHER_INLAND_WATERS",
  "OTHER_US_TERRITORIAL",
]);

/* -----------------------------
   Helpers
------------------------------ */
function toStr(v, max = 160) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s.length > max ? s.slice(0, max) : s;
}

function normalizeRole(v) {
  const x = toStr(v, 20).toUpperCase();
  return x === "OWNER" || x === "BROKER" ? x : null;
}

function normalizeE164(raw) {
  const s = toStr(raw, 40);
  if (!s) return null;
  if (!/^\+\d{7,15}$/.test(s)) return null;
  return s;
}

// ISO alpha-2 country code (US, CA, GB...) or null
function normalizeCountry2(raw) {
  const s = toStr(raw, 2).toUpperCase();
  if (!s) return null;
  if (!/^[A-Z]{2}$/.test(s)) return null;
  return s;
}

function normalizeUsRegion(raw) {
  const v = toStr(raw, 40).toUpperCase();
  if (!v) return null;
  return US_REGION_VALUES.has(v) ? v : null;
}

/**
 * ✅ Broker hero image validator:
 * - We store a Data URL for now (upload-only)
 * - Keep it bounded so DB doesn't explode
 */
function normalizeBrokerHeroImage(raw) {
  if (raw === "" || raw == null) return null;
  if (typeof raw !== "string") return null;

  const s = raw.trim();
  if (!s) return null;

  // Data URL (legacy)
  if (s.startsWith("data:image/")) {
    if (s.length > 2_000_000) return null; // keep DB bounded
    return s;
  }

  // Absolute URL
  if (/^https?:\/\//i.test(s)) {
    return s.length <= 2048 ? s : null;
  }

  // Root-relative URL
  if (s.startsWith("/")) {
    return s.length <= 2048 ? s : null;
  }

  // Treat as upload "key" (R2 object key)
  if (s.length > 512) return null;
  if (!/^[A-Za-z0-9._~\-\/]+$/.test(s)) return null;
  return s;
}

/**
 * GET /api/account/profile
 */
export async function GET() {
  const s = await readSession();
  if (!s?.uid) {
    return Response.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,

      sellerRole: true,
      phoneE164: true,

      brokerageName: true,
      brokerageStreet: true,
      brokerageCity: true,
      brokerageState: true,
      brokerageCountry: true,

      // ✅ NEW: broker hero image
      brokerHeroImageUrl: true,

      // ✅ Homeport (Option B)
      homeportCountry: true,
      homeportRegion: true,
      homeportState: true,
      homeportAdmin1: true,
      homeportCity: true,

      emailVerifiedAt: true,
    },
  });

  if (!user) {
    return Response.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  }

  return Response.json({
    ok: true,
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,

      sellerRole: user.sellerRole,
      phoneE164: user.phoneE164,

      brokerageName: user.brokerageName,
      brokerageStreet: user.brokerageStreet,
      brokerageCity: user.brokerageCity,
      brokerageState: user.brokerageState,
      brokerageCountry: user.brokerageCountry,

      // ✅ NEW
      brokerHeroImageUrl: user.brokerHeroImageUrl,

      homeportCountry: user.homeportCountry,
      homeportRegion: user.homeportRegion,
      homeportState: user.homeportState,
      homeportAdmin1: user.homeportAdmin1,
      homeportCity: user.homeportCity,

      emailVerified: Boolean(user.emailVerifiedAt),
      emailVerifiedAt: user.emailVerifiedAt,
    },
  });
}

/**
 * PATCH /api/account/profile
 */
export async function PATCH(req) {
  const s = await readSession();
  if (!s?.uid) {
    return Response.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const has = (k) => Object.prototype.hasOwnProperty.call(body || {}, k);

  // Read existing so PATCH doesn't wipe fields when they aren't provided
  const existing = await prisma.user.findUnique({
    where: { id: s.uid },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      sellerRole: true,
      emailVerifiedAt: true,
    },
  });

  if (!existing) {
    return Response.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  }

  // Compute "next" role (only changes if sellerRole provided)
  const nextRole = has("sellerRole") ? normalizeRole(body?.sellerRole) : existing.sellerRole;

  // ---- Build update data only from provided keys ----
  const data = {};

  // Names (only if provided)
  const firstName = toStr(body?.firstName, 60) || null;
  const lastName = toStr(body?.lastName, 60) || null;

  const nextFirst = has("firstName") ? firstName : existing.firstName;
  const nextLast = has("lastName") ? lastName : existing.lastName;

  if (has("firstName")) data.firstName = firstName;
  if (has("lastName")) data.lastName = lastName;

  if (has("firstName") || has("lastName")) {
    const name = nextFirst && nextLast ? `${nextFirst} ${nextLast}` : nextFirst || nextLast || null;
    data.name = name;
  }

  // sellerRole only if provided (prevents wiping)
  if (has("sellerRole")) data.sellerRole = nextRole;

  // Phone (accept aliases: phoneE164 OR phone OR phoneNumber)
  const phoneRaw = has("phoneE164")
    ? body?.phoneE164
    : has("phone")
      ? body?.phone
      : has("phoneNumber")
        ? body?.phoneNumber
        : undefined;

  if (phoneRaw !== undefined) {
    const phoneE164 =
      phoneRaw === "" || phoneRaw == null ? null : normalizeE164(phoneRaw);

    if (phoneRaw && !phoneE164) {
      return Response.json(
        { ok: false, error: "Please enter a valid phone number (ex: +14155552671)." },
        { status: 400 }
      );
    }
    data.phoneE164 = phoneE164;
  }

  // Brokerage fields (only meaningful for BROKER)
  if (nextRole === "BROKER") {
    if (has("brokerageName")) data.brokerageName = toStr(body?.brokerageName, 120) || null;
    if (has("brokerageStreet")) data.brokerageStreet = toStr(body?.brokerageStreet, 160) || null;
    if (has("brokerageCity")) data.brokerageCity = toStr(body?.brokerageCity, 120) || null;

    if (has("brokerageCountry")) {
      const brokerageCountry =
        body?.brokerageCountry === "" || body?.brokerageCountry == null
          ? null
          : normalizeCountry2(body?.brokerageCountry);

      if (body?.brokerageCountry && !brokerageCountry) {
        return Response.json({ ok: false, error: "Please select a valid brokerage country." }, { status: 400 });
      }
      data.brokerageCountry = brokerageCountry;

      // If brokerageCountry changes to US, allow brokerageState; else clear it
      if (brokerageCountry === "US") {
        if (has("brokerageState")) data.brokerageState = toStr(body?.brokerageState, 80) || null;
      } else if (has("brokerageCountry")) {
        data.brokerageState = null;
      }
    } else {
      // brokerageCountry not being updated; still allow brokerageState update if explicitly sent
      if (has("brokerageState")) data.brokerageState = toStr(body?.brokerageState, 80) || null;
    }

    // Broker hero image (only if provided)
    if (has("brokerHeroImageUrl")) {
      const brokerHeroImageUrl =
        body?.brokerHeroImageUrl === "" || body?.brokerHeroImageUrl == null
          ? null
          : normalizeBrokerHeroImage(body?.brokerHeroImageUrl);

      if (body?.brokerHeroImageUrl && !brokerHeroImageUrl) {
        return Response.json(
          { ok: false, error: "Invalid broker hero image. Please upload an image under ~1MB (3:2 recommended)." },
          { status: 400 }
        );
      }
      data.brokerHeroImageUrl = brokerHeroImageUrl;
    }
  } else {
    // If the user explicitly changed role away from BROKER, clear broker-only fields
    if (has("sellerRole")) {
      data.brokerageName = null;
      data.brokerageStreet = null;
      data.brokerageCity = null;
      data.brokerageCountry = null;
      data.brokerageState = null;
      data.brokerHeroImageUrl = null;
    } else {
      // role not being changed; if they try to set brokerHeroImageUrl while not broker, ignore (or clear if they send empty)
      if (has("brokerHeroImageUrl") && (body?.brokerHeroImageUrl === "" || body?.brokerHeroImageUrl == null)) {
        data.brokerHeroImageUrl = null;
      }
    }
  }

  // Homeport fields — only update if explicitly provided (prevents wiping)
  if (has("homeportCountry")) {
    const homeportCountry =
      body?.homeportCountry === "" || body?.homeportCountry == null ? null : normalizeCountry2(body?.homeportCountry);

    if (body?.homeportCountry && !homeportCountry) {
      return Response.json({ ok: false, error: "Please select a valid homeport country." }, { status: 400 });
    }
    data.homeportCountry = homeportCountry;

    const isUS = homeportCountry === "US";
    if (has("homeportRegion")) {
      const requestedRegion = normalizeUsRegion(body?.homeportRegion);
      if (body?.homeportRegion && isUS && !requestedRegion) {
        return Response.json({ ok: false, error: "Please select a valid U.S. region." }, { status: 400 });
      }
      data.homeportRegion = isUS ? requestedRegion : null;
    } else if (has("homeportCountry")) {
      // country changed; clear region unless US
      data.homeportRegion = isUS ? data.homeportRegion ?? null : null;
    }

    if (has("homeportState")) data.homeportState = isUS ? (toStr(body?.homeportState, 80) || null) : null;
    if (has("homeportAdmin1")) data.homeportAdmin1 = !isUS ? (toStr(body?.homeportAdmin1, 120) || null) : null;
  }

  if (has("homeportCity")) data.homeportCity = toStr(body?.homeportCity, 120) || null;

  const updated = await prisma.user.update({
    where: { id: s.uid },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,

      sellerRole: true,
      phoneE164: true,

      brokerageName: true,
      brokerageStreet: true,
      brokerageCity: true,
      brokerageState: true,
      brokerageCountry: true,

      brokerHeroImageUrl: true,

      homeportCountry: true,
      homeportRegion: true,
      homeportState: true,
      homeportAdmin1: true,
      homeportCity: true,

      emailVerifiedAt: true,
    },
  });

  return Response.json({
    ok: true,
    profile: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      firstName: updated.firstName,
      lastName: updated.lastName,

      sellerRole: updated.sellerRole,
      phoneE164: updated.phoneE164,

      brokerageName: updated.brokerageName,
      brokerageStreet: updated.brokerageStreet,
      brokerageCity: updated.brokerageCity,
      brokerageState: updated.brokerageState,
      brokerageCountry: updated.brokerageCountry,

      brokerHeroImageUrl: updated.brokerHeroImageUrl,

      homeportCountry: updated.homeportCountry,
      homeportRegion: updated.homeportRegion,
      homeportState: updated.homeportState,
      homeportAdmin1: updated.homeportAdmin1,
      homeportCity: updated.homeportCity,

      emailVerified: Boolean(updated.emailVerifiedAt),
      emailVerifiedAt: updated.emailVerifiedAt,
    },
  });
}
