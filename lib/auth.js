// lib/auth.js
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const COOKIE = "sbt_session";

function getSecret() {
  const raw = String(
    process.env.AUTH_SECRET ||
      process.env.SESSION_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      "",
  ).trim();
  if (raw) return new TextEncoder().encode(raw);

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET, SESSION_SECRET, or NEXTAUTH_SECRET must be set in production.");
  }

  return new TextEncoder().encode("dev-secret-change-me");
}

export async function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

export async function signSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getSecret());
}

export async function readSession() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload; // { uid, email, name }
  } catch {
    return null;
  }
}

export function setSessionCookie(token) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

/**
 * ✅ Bulletproof cookie clearing:
 * Must match the cookie attributes used when setting it,
 * and also set an expired date for stubborn clients.
 */
export function clearSessionCookie() {
  cookies().set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function requireUser() {
  const s = await readSession();
  if (!s?.uid) throw new Error("UNAUTHORIZED");
  return s;
}
