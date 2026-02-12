// app/api/auth/register/route.js
import prisma from "@/lib/prisma";
import { hashPassword, signSession, setSessionCookie } from "@/lib/auth";
import { sendEmail, getAppUrl } from "@/lib/email";
import crypto from "crypto";

export const runtime = "nodejs";

/* -----------------------------
   Helpers
------------------------------ */
function toStr(v, maxLen = 120) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function splitName(fullName) {
  const n = toStr(fullName, 200);
  if (!n) return { firstName: "", lastName: "" };
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts[parts.length - 1] };
}

function newToken() {
  return crypto.randomBytes(32).toString("hex"); // url-safe
}

// Very light E.164 check (frontend should build E.164; backend enforces basic shape)
function normalizeE164(raw) {
  const s = toStr(raw, 40);
  if (!s) return null;
  // Accept "+<digits>", 7-15 digits (E.164 max is 15)
  if (!/^\+\d{7,15}$/.test(s)) return null;
  return s;
}

function normalizeSellerRole(raw) {
  const v = toStr(raw, 20).toUpperCase();
  if (v === "OWNER" || v === "BROKER") return v;
  return null;
}

/* -----------------------------
   Route
------------------------------ */
export async function POST(req) {
  const body = await req.json().catch(() => null);

  const email = body?.email?.toLowerCase()?.trim();
  const password = body?.password;

  let firstName = toStr(body?.firstName ?? "", 60);
  let lastName = toStr(body?.lastName ?? "", 60);
  const businessName = toStr(body?.businessName ?? "", 120) || null;

  const incomingName = toStr(body?.name ?? "", 200);
  if ((!firstName || !lastName) && incomingName) {
    const s = splitName(incomingName);
    if (!firstName) firstName = s.firstName;
    if (!lastName) lastName = s.lastName;
  }

  const name =
    (firstName && lastName ? `${firstName} ${lastName}` : incomingName) || null;

  // ✅ New listing-contact profile fields
  const sellerRole = normalizeSellerRole(body?.sellerRole);
  const phoneE164 = normalizeE164(body?.phone || body?.phoneE164 || body?.phoneNumber);

  // Brokerage structured fields (optional)
  const brokerageName = toStr(body?.brokerageName ?? "", 120) || null;
  const brokerageStreet = toStr(body?.brokerageStreet ?? "", 160) || null;
  const brokerageCity = toStr(body?.brokerageCity ?? "", 120) || null;
  const brokerageState = toStr(body?.brokerageState ?? "", 80) || null;
  const brokerageCountry = toStr(body?.brokerageCountry ?? "", 120) || null;

  if (!email || !password) {
    return Response.json({ ok: false, error: "Email and password required." }, { status: 400 });
  }

  if (String(password).length < 8) {
    return Response.json(
      { ok: false, error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  // If you made phone required on the UI, enforce it here too.
  // (Keeping it optional for now so you don’t block international users.)
  if (body?.phone && !phoneE164) {
    return Response.json(
      { ok: false, error: "Please enter a valid phone number (include country code)." },
      { status: 400 }
    );
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return Response.json({ ok: false, error: "Email already in use." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  // ✅ verification token + expiry (3 days)
  const verifyToken = newToken();
  const verifyExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);

  // ✅ Build create data safely (only include fields that exist in schema)
  // IMPORTANT: This assumes you added these fields to Prisma:
  // sellerRole, phoneE164, brokerageName, brokerageStreet, brokerageCity, brokerageState, brokerageCountry
  const user = await prisma.user.create({
    data: {
      email,
      name,
      firstName: firstName || null,
      lastName: lastName || null,
      businessName,
      passwordHash,

      // listing-contact profile fields
      sellerRole,
      phoneE164,
      brokerageName,
      brokerageStreet,
      brokerageCity,
      brokerageState,
      brokerageCountry,

      // email verification
      emailVerifiedAt: null,
      emailVerificationToken: verifyToken,
      emailVerificationExpires: verifyExpires,
      emailVerificationSentAt: new Date(),
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
    },
  });

  const token = await signSession({
    uid: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,

    // optional extra session claims (harmless if your signSession ignores unknown)
    sellerRole: user.sellerRole || undefined,
  });

  setSessionCookie(token);

  // ✅ Send verification email (do not fail registration if this fails)
  try {
    const appUrl = getAppUrl(req);
    const displayName =
      (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name) || "";

    const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`;

    const subject = "Verify your email — SailboatTrade";
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="margin:0 0 10px;">Welcome aboard${displayName ? `, ${displayName}` : ""}!</h2>
        <p>Please verify your email to post listings and protect your account.</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;background:#c8a44d;color:#0a2230;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700;">
            Verify email
          </a>
        </p>
        <p style="color:#64748b;font-size:13px;margin-top:18px;">
          If you didn’t create this account, you can ignore this email.
        </p>
      </div>
    `;
    const text = `Verify your email: ${verifyUrl}`;

    await sendEmail({
      to: user.email,
      subject,
      html,
      text,
      tags: [{ name: "type", value: "verify_email" }],
    });
  } catch (e) {
    console.error("Verification email failed:", e?.message || e);
  }

  return Response.json({ ok: true });
}
