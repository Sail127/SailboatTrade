// app/api/auth/me/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function nullPayload() {
  return {
    ok: true,
    user: null,

    // back-compat top-level keys (your NewListingForm reads these)
    uid: null,
    email: null,
    name: null,
    firstName: null,
    lastName: null,
    phone: null,
    phoneNumber: null,

    // optional convenience
    phoneE164: null,

    sellerRole: null,
    businessName: null,

    brokerageName: null,
    brokerageStreet: null,
    brokerageCity: null,
    brokerageState: null,
    brokerageCountry: null,

    // ✅ broker hero image (so NewListingForm can autofill)
    brokerHeroImageUrl: null,

    emailVerified: false,
    emailVerifiedAt: null,
  };
}

export async function GET() {
  const s = await readSession();
  if (!s?.uid) return json(nullPayload());

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      role: true,
      isDisabled: true,
      deletedAt: true,

      // email verify
      emailVerifiedAt: true,

      // listing-contact profile fields
      sellerRole: true, // OWNER | BROKER
      phoneE164: true, // String?

      businessName: true,

      // brokerage structured fields
      brokerageName: true,
      brokerageStreet: true,
      brokerageCity: true,
      brokerageState: true,
      brokerageCountry: true,

      // ✅ IMPORTANT: must exist on User model (account page source of truth)
      brokerHeroImageUrl: true, // String? (your stored upload key/url)
    },
  });

  if (!user || user.deletedAt || user.isDisabled) return json(nullPayload());

  const emailVerified = Boolean(user.emailVerifiedAt);

  // ✅ unified user object (newer callers)
  // IMPORTANT: include aliases your NewListingForm reads when it uses data.user
  const userObj = {
    uid: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,

    emailVerified,
    emailVerifiedAt: user.emailVerifiedAt,

    sellerRole: user.sellerRole,

    // canonical
    phoneE164: user.phoneE164 || null,

    // ✅ aliases (so NewListingForm autofill works when it chooses data.user)
    phone: user.phoneE164 || null,
    phoneNumber: user.phoneE164 || null,

    businessName: user.businessName || null,

    brokerageName: user.brokerageName || null,
    brokerageStreet: user.brokerageStreet || null,
    brokerageCity: user.brokerageCity || null,
    brokerageState: user.brokerageState || null,
    brokerageCountry: user.brokerageCountry || null,

    // ✅ broker hero for autofill
    brokerHeroImageUrl: user.brokerHeroImageUrl || null,
  };

  return json({
    ok: true,

    // new shape
    user: userObj,

    // old/direct shape
    uid: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,

    // phone keys your form checks
    phoneE164: user.phoneE164 || null,
    phone: user.phoneE164 || null,
    phoneNumber: user.phoneE164 || null,

    sellerRole: user.sellerRole || null,
    businessName: user.businessName || null,

    brokerageName: user.brokerageName || user.businessName || null,
    brokerageStreet: user.brokerageStreet || null,
    brokerageCity: user.brokerageCity || null,
    brokerageState: user.brokerageState || null,
    brokerageCountry: user.brokerageCountry || null,

    // broker hero for autofill
    brokerHeroImageUrl: user.brokerHeroImageUrl || null,

    emailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
  });
}