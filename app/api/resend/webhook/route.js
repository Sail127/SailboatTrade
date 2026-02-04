import crypto from "crypto";

export const runtime = "nodejs";

/**
 * Resend webhooks include a signature header. We'll verify it using the Signing Secret.
 *
 * IMPORTANT:
 * - We must read the raw body (req.text()) to verify correctly.
 * - Header name can vary; we'll check a few common ones and log if missing.
 */
function timingSafeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export async function POST(req) {
  const secret = process.env.RESEND_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "Missing RESEND_WEBHOOK_SIGNING_SECRET" },
      { status: 500 }
    );
  }

  // 1) Get raw body
  const rawBody = await req.text();

  // 2) Pull signature header (Resend UI may use one of these names)
  const sig =
    req.headers.get("resend-signature") ||
    req.headers.get("x-resend-signature") ||
    req.headers.get("svix-signature") ||
    req.headers.get("x-webhook-signature");

  if (!sig) {
    // Log header keys to discover the correct one (remove once confirmed)
    console.log("RESEND WEBHOOK missing signature header. Headers:", [
      ...req.headers.keys(),
    ]);
    return Response.json({ ok: false, error: "Missing signature" }, { status: 401 });
  }

  // 3) Compute HMAC SHA-256 of raw body using signing secret
  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  // Some providers send "sha256=<hex>" — normalize if so
  const provided = sig.startsWith("sha256=") ? sig.slice("sha256=".length) : sig;

  if (!timingSafeEqual(provided, computed)) {
    return Response.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  // 4) Now parse JSON safely
  const body = (() => {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  })();

  if (!body) {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // 5) Log minimal useful info
  console.log("RESEND WEBHOOK EVENT:", {
    type: body?.type ?? body?.event ?? "unknown",
    id: body?.data?.id ?? body?.id ?? null,
    email_id: body?.data?.email_id ?? null,
    to: body?.data?.to ?? null,
  });

  return Response.json({ ok: true });
}
