// app/api/auth/register/route.js
import prisma from "@/lib/prisma";
import { hashPassword, signSession, setSessionCookie } from "@/lib/auth";
import { sendEmail, getAppUrl } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.json().catch(() => null);

  const email = body?.email?.toLowerCase()?.trim();
  const password = body?.password;

  // Backwards compatible: accept either name OR first/last
  const firstName = (body?.firstName ?? "").toString().trim();
  const lastName = (body?.lastName ?? "").toString().trim();
  const name =
    (firstName && lastName ? `${firstName} ${lastName}` : body?.name?.trim()) || null;

  if (!email || !password) {
    return Response.json({ ok: false, error: "Email and password required." }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return Response.json({ ok: false, error: "Email already in use." }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });

  const token = await signSession({ uid: user.id, email: user.email, name: user.name });
  setSessionCookie(token);

  // Send thank-you email (do not fail registration if this fails)
  try {
    const appUrl = getAppUrl();
    const subject = "Welcome to SailboatTrade.com — you’re all set!";
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="margin:0 0 10px;">Thanks for registering${user.name ? `, ${user.name}` : ""}!</h2>
        <p>Welcome aboard SailboatTrade.com — a sailboat-only marketplace built by sailors, for sailors.</p>
        <ul>
          <li><b>Post listings</b> with detailed sailboat-specific fields.</li>
          <li><b>Save favorites</b> and track boats you’re watching.</li>
          <li><b>Search smarter</b> with sailboat-focused filters.</li>
        </ul>
        <p>
          Ready to list your sailboat?
          <a href="${appUrl}/listings/new" style="display:inline-block;margin-left:6px;background:#c8a44d;color:#0a2230;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700;">
            Create a listing
          </a>
        </p>
        <p style="color:#64748b;font-size:13px;margin-top:18px;">
          We respect your privacy and will never sell your information.
        </p>
      </div>
    `;
    const text = `Thanks for registering! Create a listing: ${appUrl}/listings/new`;

    await sendEmail({ to: user.email, subject, html, text });
  } catch (e) {
    console.error("Welcome email failed:", e);
  }

  return Response.json({ ok: true });
}
