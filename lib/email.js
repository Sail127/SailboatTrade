import { Resend } from "resend";

let _client;
function client() {
  if (!_client) {
    if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
    _client = new Resend(process.env.RESEND_API_KEY);
  }
  return _client;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  tags,
  headers,
}) {
  if (!process.env.RESEND_FROM) throw new Error("Missing RESEND_FROM");

  const r = await client().emails.send({
    from: process.env.RESEND_FROM,
    to,
    subject,
    html,
    text,
    replyTo: replyTo ?? process.env.RESEND_REPLY_TO ?? undefined,
    tags: tags ?? undefined,      // optional in Resend
    headers: headers ?? undefined // optional
  });

  // Normalize return
  if (r?.error) throw new Error(r.error.message || "Resend error");
  return r?.data ?? r;
}
