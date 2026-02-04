export const runtime = "nodejs";

export async function POST(req) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (secret) {
    const got = req.headers.get("x-webhook-secret");
    if (got !== secret) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  console.log("RESEND WEBHOOK:", JSON.stringify(body));
  return Response.json({ ok: true });
}
