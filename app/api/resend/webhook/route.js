export const runtime = "nodejs"; // keep it on Node runtime

export async function POST(req) {
  // Resend sends JSON. We'll accept it and respond fast.
  const body = await req.json().catch(() => null);

  if (!body) {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // For now, just log so you can see payload shapes in Vercel logs.
  // Later we'll persist to DB + suppress on bounce/complaint.
  console.log("RESEND WEBHOOK:", JSON.stringify(body));

  return Response.json({ ok: true });
}
