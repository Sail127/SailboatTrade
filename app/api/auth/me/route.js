// app/api/auth/me/route.js
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readSession();
  if (!s?.uid) {
    // ✅ keep existing contract, but also include top-level fields for your current form
    return Response.json({
      ok: true,
      user: null,
      uid: null,
      email: null,
      name: null,
      firstName: null,
      lastName: null,
      phone: null,
      phoneNumber: null,
      sellerRole: null,
      businessName: null,
      brokerageName: null,
      brokerageStreet: null,
      brokerageCity: null,
      brokerageState: null,
      brokerageCountry: null,
      emailVerified: false,
      emailVerifiedAt: null,
    });
  }

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

      // ✅ Phase 1
      emailVerifiedAt: true,

      // ✅ Listing-contact profile fields (add these to User model)
      sellerRole: true, // SellerRole? (OWNER/BROKER)
      phoneE164: true, // String? (international phone in E.164)

      businessName: true,

      // ✅ Brokerage structured fields (optional)
      brokerageName: true,
      brokerageStreet: true,
      brokerageCity: true,
      brokerageState: true,
      brokerageCountry: true,
    },
  });

  if (!user || user.deletedAt || user.isDisabled) {
    return Response.json({
      ok: true,
      user: null,
      uid: null,
      email: null,
      name: null,
      firstName: null,
      lastName: null,
      phone: null,
      phoneNumber: null,
      sellerRole: null,
      businessName: null,
      brokerageName: null,
      brokerageStreet: null,
      brokerageCity: null,
      brokerageState: null,
      brokerageCountry: null,
      emailVerified: false,
      emailVerifiedAt: null,
    });
  }

  const emailVerified = Boolean(user.emailVerifiedAt);

  // ✅ Unified “user object” (newer callers)
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
    phoneE164: user.phoneE164,
    businessName: user.businessName,

    brokerageName: user.brokerageName,
    brokerageStreet: user.brokerageStreet,
    brokerageCity: user.brokerageCity,
    brokerageState: user.brokerageState,
    brokerageCountry: user.brokerageCountry,
  };

  // ✅ Back-compat top-level keys (so your current NewListingForm auto-fill works as-is)
  return Response.json({
    ok: true,

    // New shape
    user: userObj,

    // Old / direct shape used by your current form code
    uid: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,

    // Your form checks data.phone OR data.phoneNumber
    phone: user.phoneE164 || null,
    phoneNumber: user.phoneE164 || null,

    // Your form checks sellerRole / role
    sellerRole: user.sellerRole || null,

    // Your register page stores businessName
    businessName: user.businessName || null,

    // Your form checks these brokerage fields
    brokerageName: user.brokerageName || user.businessName || null,
    brokerageStreet: user.brokerageStreet || null,
    brokerageCity: user.brokerageCity || null,
    brokerageState: user.brokerageState || null,
    brokerageCountry: user.brokerageCountry || null,

    // Email verification flags
    emailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
  });
}
