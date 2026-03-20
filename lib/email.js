// lib/email.js
import { Resend } from "resend";

let _client;

function client() {
  if (!_client) {
    if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
    _client = new Resend(process.env.RESEND_API_KEY);
  }
  return _client;
}

export async function sendEmail({ to, subject, html, text, replyTo, tags, headers }) {
  if (!process.env.RESEND_FROM) throw new Error("Missing RESEND_FROM");

  const r = await client().emails.send({
    from: process.env.RESEND_FROM,
    to,
    subject,
    html,
    text,
    replyTo: replyTo ?? process.env.RESEND_REPLY_TO ?? undefined,
    tags: tags ?? undefined,
    headers: headers ?? undefined,
  });

  if (r?.error) throw new Error(r.error.message || "Resend error");
  return r?.data ?? r;
}

export function getAppUrl(req) {
  // 1) Prefer explicit env var
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL;

  if (explicit) return String(explicit).replace(/\/+$/, "");

  // 2) Infer from request headers (route handlers)
  if (req?.headers?.get) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (host) return `${proto}://${host}`.replace(/\/+$/, "");
  }

  // 3) Vercel fallback
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // 4) Local fallback
  return "http://localhost:3000";
}
