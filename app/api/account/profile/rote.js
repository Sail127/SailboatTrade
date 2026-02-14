// app/api/account/profile/route.js
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/account/profile
 * Returns the logged-in user's profile fields used by registration + listing autofill.
 */
export async function GET() {
  const s = await readSession();
  if (!s?.uid) {
    return Response.json(
      { ok: false, error: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      businessName: true,
      sellerRole: true,
      phoneE164: true,
      brokerageName: true,
      brokerageStreet: true,
      brokerageCity: true,
      brokerageState: true,
      brokerageCountry: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    return Response.json(
      { ok: false, error: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  return Response.json({
    ok: true,
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: user.businessName,
      sellerRole: user.sellerRole,
      phoneE164: user.phoneE164,
      brokerageName: user.brokerageName,
      brokerageStreet: user.brokerageStreet,
      brokerageCity: user.brokerageCity,
      brokerageState: user.brokerageState,
      brokerageCountry: user.brokerageCountry,
      emailVerified: Boolean(user.emailVerifiedAt),
      emailVerifiedAt: user.emailVerifiedAt,
    },
  });
}

/**
 * PATCH /api/account/profile
 * Updates profile fields (name/address/role/phone/etc).
 */
export async function PATCH(req) {
  const s = await readSession();
  if (!s?.uid) {
    return Response.json(
      { ok: false, error: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));

  const toStr = (v, max = 160) => {
    if (typeof v !== "string") return "";
    const s = v.trim();
    return s.length > max ? s.slice(0, max) : s;
  };

  const normalizeRole = (v) => {
    const x = toStr(v, 20).toUpperCase();
    return x === "OWNER" || x === "BROKER" ? x : null;
  };

  const normalizeE164 = (raw) => {
    const s = toStr(raw, 40);
    if (!s) return null;
    if (!/^\+\d{7,15}$/.test(s)) return null;
    return s;
  };

  const firstName = toStr(body?.firstName, 60) || null;
  const lastName = toStr(body?.lastName, 60) || null;
  const businessName = toStr(body?.businessName, 120) || null;
  const sellerRole = normalizeRole(body?.sellerRole);

  const phoneE164 =
    body?.phoneE164 === "" || body?.phoneE164 == null
      ? null
      : normalizeE164(body?.phoneE164);

  // If user provided phone, enforce validity
  if (body?.phoneE164 && !phoneE164) {
    return Response.json(
      { ok: false, error: "Please enter a valid phone number in E.164 format (ex: +14155552671)." },
      { status: 400 },
    );
  }

  // Brokerage fields (only meaningful if BROKER; otherwise we clear them)
  const brokerageName = toStr(body?.brokerageName, 120) || null;
  const brokerageStreet = toStr(body?.brokerageStreet, 160) || null;
  const brokerageCity = toStr(body?.brokerageCity, 120) || null;
  const brokerageState = toStr(body?.brokerageState, 80) || null;
  const brokerageCountry = toStr(body?.brokerageCountry, 120) || null;

  const name =
    firstName && lastName ? `${firstName} ${lastName}` : (firstName || lastName || null);

  const updated = await prisma.user.update({
    where: { id: s.uid },
    data: {
      firstName,
      lastName,
      name,
      businessName,
      sellerRole,

      phoneE164,

      brokerageName: sellerRole === "BROKER" ? brokerageName : null,
      brokerageStreet: sellerRole === "BROKER" ? brokerageStreet : null,
      brokerageCity: sellerRole === "BROKER" ? brokerageCity : null,
      brokerageState: sellerRole === "BROKER" ? brokerageState : null,
      brokerageCountry: sellerRole === "BROKER" ? brokerageCountry : null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      businessName: true,
      sellerRole: true,
      phoneE164: true,
      brokerageName: true,
      brokerageStreet: true,
      brokerageCity: true,
      brokerageState: true,
      brokerageCountry: true,
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
      businessName: updated.businessName,
      sellerRole: updated.sellerRole,
      phoneE164: updated.phoneE164,
      brokerageName: updated.brokerageName,
      brokerageStreet: updated.brokerageStreet,
      brokerageCity: updated.brokerageCity,
      brokerageState: updated.brokerageState,
      brokerageCountry: updated.brokerageCountry,
      emailVerified: Boolean(updated.emailVerifiedAt),
      emailVerifiedAt: updated.emailVerifiedAt,
    },
  });
}
