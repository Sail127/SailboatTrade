// lib/passwordResetToken.js
import crypto from "crypto";

function b64urlEncode(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

function getSecret() {
  const s = process.env.RESET_TOKEN_SECRET || process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (!s) throw new Error("Missing RESET_TOKEN_SECRET (or AUTH_SECRET / SESSION_SECRET).");
  return s;
}

export function createResetToken({ email, ttlMinutes = 30 }) {
  const exp = Date.now() + ttlMinutes * 60 * 1000;
  const payload = { email, exp, nonce: crypto.randomBytes(8).toString("hex") };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));

  const sig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest();
  const sigB64 = b64urlEncode(sig);

  return `${payloadB64}.${sigB64}`;
}

export function verifyResetToken(token) {
  if (!token || typeof token !== "string") return null;
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;

  const expected = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest();
  const expectedB64 = b64urlEncode(expected);

  // timing-safe compare
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expectedB64);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  if (!payload?.email || !payload?.exp) return null;
  if (Date.now() > Number(payload.exp)) return null;

  return { email: String(payload.email).toLowerCase().trim() };
}
