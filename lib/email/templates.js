export function baseTemplate({ title, preheader, contentHtml }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f6f7f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preheader || "")}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.06);">
            <tr>
              <td style="padding:20px 24px;background:#0a2230;color:#fff;">
                <div style="font-size:18px;font-weight:700;">SailboatTrade</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;color:#111827;font-size:15px;line-height:1.5;">
                ${contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px;color:#6b7280;font-size:12px;background:#fafafa;">
                If you didn’t request this, you can ignore this email.
              </td>
            </tr>
          </table>
          <div style="font-size:12px;color:#9ca3af;margin-top:10px;">
            © ${new Date().getFullYear()} SailboatTrade.com
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function verifyEmailTemplate({ url }) {
  return baseTemplate({
    title: "Verify your email",
    preheader: "Confirm your SailboatTrade email address.",
    contentHtml: `
      <h1 style="margin:0 0 12px;font-size:20px;">Verify your email</h1>
      <p style="margin:0 0 16px;">Click the button below to verify your email address.</p>
      <p style="margin:0 0 18px;">
        <a href="${url}" style="display:inline-block;background:#c8a44d;color:#0a2230;text-decoration:none;font-weight:700;padding:12px 16px;border-radius:12px;">
          Verify Email
        </a>
      </p>
      <p style="margin:0;color:#6b7280;font-size:13px;">Or copy/paste this link: <br/><span>${url}</span></p>
    `,
  });
}

export function passwordResetTemplate({ url }) {
  return baseTemplate({
    title: "Reset your password",
    preheader: "Reset your SailboatTrade password.",
    contentHtml: `
      <h1 style="margin:0 0 12px;font-size:20px;">Reset your password</h1>
      <p style="margin:0 0 16px;">Use the link below to reset your password.</p>
      <p style="margin:0 0 18px;">
        <a href="${url}" style="display:inline-block;background:#0a2230;color:#fff;text-decoration:none;font-weight:700;padding:12px 16px;border-radius:12px;">
          Reset Password
        </a>
      </p>
      <p style="margin:0;color:#6b7280;font-size:13px;">If you didn’t request this, ignore it.</p>
    `,
  });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
