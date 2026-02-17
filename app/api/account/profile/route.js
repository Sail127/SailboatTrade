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

      // ✅ Homeport (Option B)
      homeportCountry: true,
      homeportRegion: true,
      homeportState: true,   // US-only
      homeportAdmin1: true,  // non-US province/region
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

  const firstName = toStr(body?.firstName, 60) || null;
  const lastName = toStr(body?.lastName, 60) || null;
  const sellerRole = normalizeRole(body?.sellerRole);

  const phoneE164 =
    body?.phoneE164 === "" || body?.phoneE164 == null
      ? null
      : normalizeE164(body?.phoneE164);

  if (body?.phoneE164 && !phoneE164) {
    return Response.json(
      { ok: false, error: "Please enter a valid phone number (ex: +14155552671)." },
      { status: 400 }
    );
  }

  // Brokerage fields
  const brokerageName = toStr(body?.brokerageName, 120) || null;
  const brokerageStreet = toStr(body?.brokerageStreet, 160) || null;
  const brokerageCity = toStr(body?.brokerageCity, 120) || null;

  const brokerageCountry = body?.brokerageCountry === "" || body?.brokerageCountry == null
    ? null
    : normalizeCountry2(body?.brokerageCountry);

  if (body?.brokerageCountry && !brokerageCountry) {
    return Response.json({ ok: false, error: "Please select a valid brokerage country." }, { status: 400 });
  }

  const brokerageStateRaw = toStr(body?.brokerageState, 80) || null;
  const brokerageState = brokerageCountry === "US" ? brokerageStateRaw : null;

  // ✅ Homeport fields (Option B)
  const homeportCountry = body?.homeportCountry === "" || body?.homeportCountry == null
    ? null
    : normalizeCountry2(body?.homeportCountry);

  if (body?.homeportCountry && !homeportCountry) {
    return Response.json({ ok: false, error: "Please select a valid homeport country." }, { status: 400 });
  }

  const isUS = homeportCountry === "US";

  const homeportCity = toStr(body?.homeportCity, 120) || null;

  // Region only valid for US
  const requestedRegion = normalizeUsRegion(body?.homeportRegion);
  if (body?.homeportRegion && isUS && !requestedRegion) {
    return Response.json({ ok: false, error: "Please select a valid U.S. region." }, { status: 400 });
  }
  const homeportRegion = isUS ? requestedRegion : null;

  // US state only when US
  const homeportStateRaw = toStr(body?.homeportState, 80) || null;
  const homeportState = isUS ? homeportStateRaw : null;

  // non-US province/region only when NOT US
  const homeportAdmin1Raw = toStr(body?.homeportAdmin1, 120) || null;
  const homeportAdmin1 = !isUS ? homeportAdmin1Raw : null;

  const name =
    firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null;

  const updated = await prisma.user.update({
    where: { id: s.uid },
    data: {
      firstName,
      lastName,
      name,
      sellerRole,

      phoneE164,

      brokerageName: sellerRole === "BROKER" ? brokerageName : null,
      brokerageStreet: sellerRole === "BROKER" ? brokerageStreet : null,
      brokerageCity: sellerRole === "BROKER" ? brokerageCity : null,
      brokerageCountry: sellerRole === "BROKER" ? brokerageCountry : null,
      brokerageState: sellerRole === "BROKER" ? brokerageState : null,

      homeportCountry,
      homeportRegion,
      homeportState,
      homeportAdmin1,
      homeportCity,
    },
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
