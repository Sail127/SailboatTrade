import { sendEmail } from "@/lib/email";

export async function POST(req) {
  const token = req.headers.get("x-email-test-token");
  if (token !== process.env.EMAIL_TEST_TOKEN) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { to } = await req.json().catch(() => ({}));
  if (!to) {
    return Response.json({ ok: false, error: "Missing { to }" }, { status: 400 });
  }

  try {
    const r = await sendEmail({
      to,
      subject: "SailboatTrade — Resend test",
      html: "<p>✅ Resend is working from your app.</p>",
      text: "✅ Resend is working from your app.",
    });

    // Resend Node SDK returns { data, error } in many examples
    return Response.json({
      ok: true,
      data: r?.data ?? null,
      error: r?.error ?? null,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
