const BRAND = {
  navy: "#0a2230",
  navySoft: "#15384d",
  gold: "#c8a44d",
  goldSoft: "#f6ebc8",
  ink: "#13202b",
  slate: "#465967",
  line: "#d8e1e7",
  shell: "#f4f7f9",
  white: "#ffffff",
};

const PUBLIC_SITE_URL = "https://www.sailboattrade.com";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h\d>/gi, "\n\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

function resolvePublicAppUrl(appUrl) {
  const preferred =
    normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeUrl(process.env.APP_URL) ||
    normalizeUrl(process.env.NEXTAUTH_URL);

  if (preferred && !/localhost|127\.0\.0\.1/i.test(preferred)) {
    return preferred;
  }

  const requested = normalizeUrl(appUrl);
  if (requested && !/localhost|127\.0\.0\.1/i.test(requested)) {
    return requested;
  }

  return PUBLIC_SITE_URL;
}

function siteAssets(appUrl) {
  const base = resolvePublicAppUrl(appUrl);
  return {
    base,
    logoUrl: `${base}/burgee.png`,
  };
}

function pill(text, tone = "gold") {
  const bg = tone === "navy" ? BRAND.navy : BRAND.goldSoft;
  const color = tone === "navy" ? BRAND.white : "#745300";
  return `
    <span style="display:inline-block;padding:7px 12px;border-radius:999px;background:${bg};color:${color};font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">
      ${esc(text)}
    </span>
  `;
}

function ctaButton(label, href, tone = "gold") {
  const bg = tone === "navy" ? BRAND.navy : BRAND.gold;
  const color = tone === "navy" ? BRAND.white : BRAND.navy;
  return `
    <a href="${esc(href)}" style="display:inline-block;padding:14px 20px;border-radius:999px;background:${bg};color:${color};text-decoration:none;font-weight:800;font-size:15px;box-shadow:0 10px 24px rgba(10,34,48,.18);">
      ${esc(label)}
    </a>
  `;
}

function sectionBlock({ label, body, tone = "default" }) {
  const bg = tone === "gold" ? "#fff8e7" : "#f7fafc";
  const border = tone === "gold" ? "#ead49a" : BRAND.line;
  return `
    <div style="margin:0 0 14px;padding:14px 16px;border:1px solid ${border};border-radius:16px;background:${bg};">
      <div style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:.08em;color:${BRAND.slate};text-transform:uppercase;">
        ${esc(label)}
      </div>
      <div style="font-size:15px;line-height:1.6;color:${BRAND.ink};">
        ${body}
      </div>
    </div>
  `;
}

function linkLine(label, href) {
  return `
    <div style="margin:0 0 10px;">
      <a href="${esc(href)}" style="color:${BRAND.navy};font-weight:700;text-decoration:underline;">
        ${esc(label)}
      </a>
    </div>
  `;
}

function wrapEmail({
  appUrl,
  title,
  preheader,
  eyebrow,
  headline,
  intro,
  heroTitle,
  heroBody,
  primaryCta,
  secondaryCta,
  sections = [],
  links = [],
  notice,
  footerNote,
  prioritizePrimaryCta = false,
}) {
  const assets = siteAssets(appUrl);
  const safeTitle = esc(title);
  const safePreheader = esc(preheader || "");
  const headerEyebrow = eyebrow ? pill(eyebrow) : "";
  const primary = primaryCta ? ctaButton(primaryCta.label, primaryCta.href, primaryCta.tone) : "";
  const secondary = secondaryCta ? ctaButton(secondaryCta.label, secondaryCta.href, secondaryCta.tone || "navy") : "";
  const sectionsHtml = sections.join("");
  const linksHtml = links.join("");
  const footerHtml = footerNote
    ? `<div style="margin-top:14px;font-size:12px;line-height:1.6;color:${BRAND.slate};">${footerNote}</div>`
    : "";
  const headerPrimary = prioritizePrimaryCta && primary
    ? `<div style="margin:18px 0 0;">${primary}</div>`
    : "";
  const lowerPrimary = !prioritizePrimaryCta ? primary : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      @media only screen and (max-width: 640px) {
        .sbt-shell {
          border-radius: 20px !important;
        }
        .sbt-stack,
        .sbt-stack tbody,
        .sbt-stack tr,
        .sbt-stack td {
          display: block !important;
          width: 100% !important;
        }
        .sbt-pad {
          padding-left: 18px !important;
          padding-right: 18px !important;
        }
        .sbt-title {
          font-size: 22px !important;
        }
        .sbt-hero-title {
          font-size: 17px !important;
        }
        .sbt-hero-copy {
          font-size: 14px !important;
        }
        .sbt-button-wrap a {
          display: block !important;
          margin: 0 0 12px 0 !important;
          text-align: center !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;background:${BRAND.shell};font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${safePreheader}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.shell};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sbt-shell" style="max-width:640px;background:${BRAND.white};border-radius:28px;overflow:hidden;border:1px solid #dbe5ea;box-shadow:0 18px 40px rgba(10,34,48,.12);">
            <tr>
              <td class="sbt-pad" style="background:linear-gradient(135deg,${BRAND.navy} 0%,${BRAND.navySoft} 64%,#1d4f67 100%);padding:22px 24px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:18px;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="vertical-align:middle;padding-right:12px;">
                            <img src="${esc(assets.logoUrl)}" width="44" height="28" alt="SailboatTrade burgee" style="display:block;border:0;" />
                          </td>
                          <td style="vertical-align:middle;">
                            <div style="font-size:24px;font-weight:800;color:${BRAND.white};letter-spacing:.01em;">SailboatTrade.com</div>
                            <div style="font-size:12px;color:#f3f8fc;font-weight:700;">All Sailboats, All the Time!</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 24px;">
                      ${headerEyebrow}
                      <h1 class="sbt-title" style="margin:16px 0 10px;font-size:30px;line-height:1.18;color:${BRAND.white};">${esc(headline)}</h1>
                      <p style="margin:0;max-width:520px;font-size:15px;line-height:1.65;color:#f4f8fb;font-weight:500;">${esc(intro)}</p>
                      ${headerPrimary}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="sbt-pad" style="padding:0 24px;">
                <div style="margin:-8px 0 0;border:1px solid #d9c486;border-radius:22px;background:linear-gradient(90deg,#fffdf8 0%,#fff4d7 100%);box-shadow:0 16px 30px rgba(10,34,48,.08);padding:24px 22px;">
                  <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#8a6a12;">SailboatTrade Update</div>
                  <div class="sbt-hero-title" style="margin:8px 0 10px;font-size:23px;line-height:1.2;font-weight:800;color:${BRAND.navy};">${esc(heroTitle)}</div>
                  <div class="sbt-hero-copy" style="font-size:14px;line-height:1.65;color:${BRAND.ink};">${esc(heroBody)}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td class="sbt-pad" style="padding:28px 24px 10px;">
                ${sectionsHtml}
              </td>
            </tr>
            <tr>
              <td class="sbt-pad" style="padding:0 24px 6px;">
                <div class="sbt-button-wrap" style="margin:0 0 18px;">
                  ${lowerPrimary}
                  ${lowerPrimary && secondary ? `&nbsp;&nbsp;${secondary}` : secondary}
                </div>
                ${linksHtml}
                ${
                  notice
                    ? `<div style="margin:18px 0 0;padding:14px 16px;border-radius:16px;background:#f7fafc;border:1px solid ${BRAND.line};font-size:13px;line-height:1.65;color:${BRAND.slate};">${notice}</div>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td class="sbt-pad" style="padding:18px 24px 26px;border-top:1px solid #e7edf1;background:#fbfdfe;">
                <div style="font-size:13px;line-height:1.7;color:${BRAND.slate};">
                  SailboatTrade.com helps sailors buy, sell, and discover sailboats with confidence.
                </div>
                ${footerHtml}
                <div style="margin-top:12px;font-size:12px;color:${BRAND.slate};">
                  © ${new Date().getFullYear()} SailboatTrade.com
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function createMessage({
  appUrl,
  subject,
  preheader,
  eyebrow,
  headline,
  intro,
  heroTitle,
  heroBody,
  sections,
  primaryCta,
  secondaryCta,
  links,
  notice,
  footerNote,
  textLines,
  prioritizePrimaryCta,
}) {
  const html = wrapEmail({
    appUrl,
    title: subject,
    preheader,
    eyebrow,
    headline,
    intro,
    heroTitle,
    heroBody,
    sections,
    primaryCta,
    secondaryCta,
    links,
    notice,
    footerNote,
    prioritizePrimaryCta,
  });

  const text = Array.isArray(textLines) && textLines.length
    ? textLines.filter(Boolean).join("\n\n")
    : stripHtml(html);

  return { subject, html, text };
}

function personName({ displayName, fallback = "there" }) {
  return String(displayName || "").trim() || fallback;
}

export function buildVerifyEmailMessage({
  appUrl,
  verifyUrl,
  displayName,
  reason = "signup",
}) {
  const who = personName({ displayName });
  const isResend = reason === "resend";
  return createMessage({
    appUrl,
    subject: isResend
      ? "Verify your email — SailboatTrade"
      : "Welcome to SailboatTrade — verify your email",
    preheader: isResend
      ? "Confirm your email to activate posting privileges and secure your account."
      : "Welcome to SailboatTrade. Verify your email to unlock full site functionality.",
    eyebrow: isResend ? "Verification Reminder" : "Welcome Aboard",
    headline: isResend ? `Verify your email, ${who}` : `Welcome to SailboatTrade, ${who}`,
    intro: isResend
      ? "Your account is almost ready. Verify your email to unlock listing creation and keep your SailboatTrade account protected."
      : "Welcome aboard. Verify your email to unlock full site functionality, including posting listings and managing your account without interruptions.",
    heroTitle: isResend
      ? "Confirm your email and start listing with confidence."
      : "You are almost ready to buy, sell, and manage listings with confidence.",
    heroBody: isResend
      ? "We require a verified email before a new listing can be posted. It is a simple step that helps protect both buyers and sellers."
      : "We require a verified email before a new listing can be posted. It is a simple step that helps protect both buyers and sellers while unlocking the full SailboatTrade experience.",
    sections: [
      sectionBlock({
        label: isResend ? "What happens next" : "Welcome to the marketplace",
        body: isResend
          ? "Click the button below to confirm your email address. Once verified, your account can create listings, manage saved boats, and use dashboard features without interruption."
          : "Click the button below to confirm your email address. Once verified, your account can create listings, manage saved boats, and use dashboard features without interruption.",
        tone: "gold",
      }),
      sectionBlock({
        label: "Verification link",
        body: `If the main button does not open, copy and paste this link into your browser:<br /><span style="word-break:break-all;color:${BRAND.navy};">${esc(verifyUrl)}</span>`,
      }),
    ],
    primaryCta: { label: "Verify Email", href: verifyUrl, tone: "gold" },
    links: [linkLine("Open SailboatTrade.com", normalizeUrl(appUrl) || verifyUrl)],
    notice: "If you did not create this account, you can safely ignore this email and no further action is needed.",
    footerNote: "Questions? Reply to this message and our team will be happy to help.",
    prioritizePrimaryCta: true,
    textLines: [
      isResend ? `Verify your email${who ? `, ${who}` : ""}` : `Welcome to SailboatTrade${who ? `, ${who}` : ""}`,
      isResend
        ? "Confirm your email to activate listing privileges and secure your account."
        : "Welcome aboard. Verify your email to unlock full site functionality and posting privileges.",
      `Verify email: ${verifyUrl}`,
      "If you did not create this account, you can ignore this email.",
    ],
  });
}

export function buildPasswordResetMessage({
  appUrl,
  resetUrl,
  displayName,
  expiresInMinutes = 30,
}) {
  const who = personName({ displayName });
  return createMessage({
    appUrl,
    subject: "Reset your SailboatTrade password",
    preheader: "Use this secure link to choose a new password.",
    eyebrow: "Account Security",
    headline: `Reset your password, ${who}`,
    intro: "We received a request to reset your SailboatTrade password. Use the secure button below to choose a new one.",
    heroTitle: "Keep your account secure and get back on the water.",
    heroBody: `This reset link expires in ${expiresInMinutes} minutes and is intended for one-time use.`,
    sections: [
      sectionBlock({
        label: "Reset instructions",
        body: "Open the secure reset link, choose a strong password, and sign in again with your updated credentials.",
        tone: "gold",
      }),
      sectionBlock({
        label: "Secure link",
        body: `Reset your password here:<br /><span style="word-break:break-all;color:${BRAND.navy};">${esc(resetUrl)}</span>`,
      }),
    ],
    primaryCta: { label: "Reset Password", href: resetUrl, tone: "gold" },
    links: [linkLine("Visit SailboatTrade.com", normalizeUrl(appUrl) || resetUrl)],
    notice: "If you did not request a password reset, you can ignore this email. Your password will remain unchanged.",
    footerNote: "For your protection, SailboatTrade support will never ask for your password by email.",
    prioritizePrimaryCta: true,
    textLines: [
      `Reset your password, ${who}`,
      `Use this secure link within ${expiresInMinutes} minutes: ${resetUrl}`,
      "If you did not request this change, you can ignore this email.",
    ],
  });
}

export function buildAdminListingPendingReviewMessage({
  appUrl,
  listingTitle,
  listingId,
  ownerName,
  ownerEmail,
  reviewUrl,
  previewUrl,
  submittedAtIso,
  source,
}) {
  return createMessage({
    appUrl,
    subject: `Listing pending admin review: ${listingTitle}`,
    preheader: "A newly submitted listing is waiting in the review queue.",
    eyebrow: "Admin Review",
    headline: "A listing is waiting for review",
    intro: "A submitted listing has entered the admin queue and is ready for moderation.",
    heroTitle: "Review, approve, and keep the marketplace polished.",
    heroBody: "This notification includes the owner details, submission source, and direct links to the moderation tools.",
    sections: [
      sectionBlock({
        label: "Listing",
        body: `<strong>${esc(listingTitle)}</strong><br />Listing ID: ${esc(listingId)}`,
        tone: "gold",
      }),
      sectionBlock({
        label: "Owner",
        body: `${esc(ownerName)}<br /><a href="mailto:${esc(ownerEmail)}" style="color:${BRAND.navy};">${esc(ownerEmail)}</a>`,
      }),
      sectionBlock({
        label: "Submission details",
        body: `Submitted at: ${esc(submittedAtIso)}<br />Source: ${esc(source)}`,
      }),
    ],
    primaryCta: { label: "Preview and Approve", href: reviewUrl, tone: "gold" },
    secondaryCta: { label: "Open Raw Preview", href: previewUrl, tone: "navy" },
    notice: "This message is intended for SailboatTrade staff handling listing moderation.",
    textLines: [
      "A listing is waiting for admin review.",
      `Listing: ${listingTitle}`,
      `Listing ID: ${listingId}`,
      `Owner: ${ownerName} (${ownerEmail})`,
      `Submitted at: ${submittedAtIso}`,
      `Source: ${source}`,
      `Review queue: ${reviewUrl}`,
      `Preview: ${previewUrl}`,
    ],
  });
}

export function buildOwnerListingPendingReviewMessage({
  appUrl,
  ownerName,
  listingTitle,
  listingId,
  listingUrl,
  dashboardUrl,
  source,
}) {
  return createMessage({
    appUrl,
    subject: "Thank you — your listing is pending admin review",
    preheader: "Your payment was received and your listing is now in the review queue.",
    eyebrow: "Listing Submitted",
    headline: `Thank you, ${personName({ displayName: ownerName })}`,
    intro: "We received your listing payment and your submission is now waiting for admin review before it goes live.",
    heroTitle: "Your listing is on deck for final review.",
    heroBody: "Most reviews are completed within 24 hours. If we need anything adjusted, we will let you know and return the listing to draft for quick edits.",
    sections: [
      sectionBlock({
        label: "Listing",
        body: `<strong>${esc(listingTitle)}</strong><br />Listing ID: ${esc(listingId)}`,
        tone: "gold",
      }),
      sectionBlock({
        label: "What to expect",
        body: "Our team checks content quality, listing completeness, and overall presentation before publishing to the marketplace.",
      }),
      sectionBlock({
        label: "Submission source",
        body: esc(source),
      }),
    ],
    primaryCta: { label: "View Listing", href: listingUrl, tone: "gold" },
    secondaryCta: { label: "Open Listings Dashboard", href: dashboardUrl, tone: "navy" },
    notice: "No further action is needed right now unless our review team requests edits.",
    textLines: [
      `Thank you, ${ownerName}`,
      `We received your payment for ${listingTitle}.`,
      "Your listing is now pending admin review before it goes live.",
      `Listing ID: ${listingId}`,
      `View listing: ${listingUrl}`,
      `Dashboard: ${dashboardUrl}`,
      `Source: ${source}`,
    ],
  });
}

export function buildOwnerListingPublishedMessage({
  appUrl,
  ownerName,
  listingTitle,
  listingId,
  listingUrl,
  dashboardUrl,
  editUrl,
  source,
}) {
  return createMessage({
    appUrl,
    subject: "Congratulations — your listing is now live on SailboatTrade",
    preheader: "Your listing has been approved and is now visible to buyers.",
    eyebrow: "Listing Approved",
    headline: `Your listing is live, ${personName({ displayName: ownerName })}`,
    intro: "Great news. Your listing has been approved and is now visible to buyers across SailboatTrade.",
    heroTitle: "Your boat is officially in front of the market.",
    heroBody: "You can review the live presentation, make updates from your dashboard, and start responding to buyer interest right away.",
    sections: [
      sectionBlock({
        label: "Listing",
        body: `<strong>${esc(listingTitle)}</strong><br />Listing ID: ${esc(listingId)}`,
        tone: "gold",
      }),
      sectionBlock({
        label: "Next steps",
        body: "Monitor inquiries, keep details current, and refresh photos or pricing whenever your listing needs an update.",
      }),
      sectionBlock({
        label: "Source",
        body: esc(source),
      }),
    ],
    primaryCta: { label: "View Live Listing", href: listingUrl, tone: "gold" },
    secondaryCta: { label: "Open Dashboard", href: dashboardUrl, tone: "navy" },
    links: [linkLine("Edit this listing", editUrl)],
    notice: "If you spot anything that needs adjusting, you can edit the listing at any time from your dashboard.",
    textLines: [
      `Congratulations, ${ownerName}. Your listing is now live.`,
      `Listing: ${listingTitle}`,
      `Listing ID: ${listingId}`,
      `View live listing: ${listingUrl}`,
      `Dashboard: ${dashboardUrl}`,
      `Edit listing: ${editUrl}`,
      `Source: ${source}`,
    ],
  });
}

export function buildOwnerListingRejectedMessage({
  appUrl,
  ownerName,
  listingTitle,
  listingId,
  dashboardUrl,
  editUrl,
  rejectionReason,
  source,
}) {
  return createMessage({
    appUrl,
    subject: "Changes requested for your SailboatTrade listing",
    preheader: "Your listing needs a few updates before it can be approved.",
    eyebrow: "Changes Requested",
    headline: `Your listing needs updates, ${personName({ displayName: ownerName })}`,
    intro: "Our review team has sent your listing back with comments. Please make the requested changes and resubmit it for approval.",
    heroTitle: "A few edits should get this listing back on course.",
    heroBody: "Use the admin comments below as your checklist, then open the listing editor and resubmit when everything looks right.",
    sections: [
      sectionBlock({
        label: "Listing",
        body: `<strong>${esc(listingTitle)}</strong><br />Listing ID: ${esc(listingId)}`,
        tone: "gold",
      }),
      sectionBlock({
        label: "Admin comments",
        body: esc(rejectionReason || "Changes are required before this listing can be approved.").replaceAll("\n", "<br />"),
      }),
      sectionBlock({
        label: "What to do next",
        body: "Open your listing editor, make the requested changes, save your updates, and submit the listing for review again when you are ready.",
      }),
      sectionBlock({
        label: "Review source",
        body: esc(source),
      }),
    ],
    primaryCta: { label: "Edit Listing", href: editUrl, tone: "gold" },
    secondaryCta: { label: "Open Listings Dashboard", href: dashboardUrl, tone: "navy" },
    notice: "If anything in the review comments is unclear, reply to this email and the SailboatTrade team will help you get the listing approved.",
    textLines: [
      `Changes requested for your listing, ${ownerName}`,
      `Listing: ${listingTitle}`,
      `Listing ID: ${listingId}`,
      `Admin comments: ${rejectionReason || "Changes are required before approval."}`,
      `Edit listing: ${editUrl}`,
      `Dashboard: ${dashboardUrl}`,
      `Source: ${source}`,
    ],
  });
}

export function buildSellerInquiryMessage({
  appUrl,
  listingTitle,
  listingUrl,
  buyerName,
  buyerEmail,
  buyerPhone,
  message,
}) {
  const safeMessage = esc(message).replaceAll("\n", "<br />");
  return createMessage({
    appUrl,
    subject: `New buyer inquiry for ${listingTitle} — SailboatTrade`,
    preheader: "A prospective buyer just sent a message through your listing.",
    eyebrow: "Buyer Inquiry",
    headline: "You received a new buyer inquiry",
    intro: "A prospective buyer reached out through your SailboatTrade listing. Their details are below so you can respond quickly.",
    heroTitle: "Warm leads deserve a fast, professional follow-up.",
    heroBody: "Respond promptly, answer the buyer’s questions clearly, and keep the conversation focused on the listing details.",
    sections: [
      sectionBlock({
        label: "Buyer",
        body: `${esc(buyerName)}<br /><a href="mailto:${esc(buyerEmail)}" style="color:${BRAND.navy};">${esc(buyerEmail)}</a><br />Phone: ${esc(buyerPhone || "Not provided")}`,
        tone: "gold",
      }),
      sectionBlock({
        label: "Message",
        body: safeMessage,
      }),
      sectionBlock({
        label: "Listing",
        body: `<strong>${esc(listingTitle)}</strong>`,
      }),
    ],
    primaryCta: { label: "View Listing", href: listingUrl, tone: "gold" },
    notice: "You can reply directly to this email and your response will go to the buyer who submitted the inquiry.",
    textLines: [
      `New buyer inquiry for ${listingTitle}`,
      `Buyer: ${buyerName}`,
      `Buyer email: ${buyerEmail}`,
      `Buyer phone: ${buyerPhone || "Not provided"}`,
      `Message: ${message}`,
      `View listing: ${listingUrl}`,
    ],
  });
}

export function buildBuyerInquiryConfirmationMessage({
  appUrl,
  buyerName,
  sellerName,
  listingTitle,
  listingUrl,
}) {
  return createMessage({
    appUrl,
    subject: `Thanks for your interest in ${listingTitle} — SailboatTrade`,
    preheader: "Your inquiry has been delivered to the seller.",
    eyebrow: "Inquiry Sent",
    headline: `Thanks for reaching out, ${personName({ displayName: buyerName })}`,
    intro: `Your message has been sent to ${sellerName}. They have been notified about your interest in ${listingTitle}.`,
    heroTitle: "You are one step closer to your next sailboat.",
    heroBody: "Sellers typically respond directly by email. Keep an eye on your inbox and spam folder just in case their first reply lands there.",
    sections: [
      sectionBlock({
        label: "Seller notified",
        body: `${esc(sellerName)} has received your inquiry and can respond directly to the email address you provided.`,
        tone: "gold",
      }),
      sectionBlock({
        label: "Listing",
        body: `<strong>${esc(listingTitle)}</strong>`,
      }),
    ],
    primaryCta: { label: "View Listing", href: listingUrl, tone: "gold" },
    links: [linkLine("Browse more sailboats", `${normalizeUrl(appUrl)}/listings`)],
    notice: "If you do not hear back right away, it may simply mean the seller is away from their inbox or on the water.",
    textLines: [
      `Thanks for your interest, ${buyerName}.`,
      `${sellerName} has been notified about your interest in ${listingTitle}.`,
      `View listing: ${listingUrl}`,
    ],
  });
}

function sampleAppUrl(appUrl) {
  return resolvePublicAppUrl(appUrl);
}

export function getEmailPreviewCatalog({ appUrl, currentAdminEmail, currentAdminName }) {
  const base = sampleAppUrl(appUrl);
  const sampleListingId = "sample-listing-42";
  const sampleReviewUrl = `${base}/dashboard/admin/review/${encodeURIComponent(sampleListingId)}`;
  const sampleListingUrl = `${base}/listings/${encodeURIComponent(sampleListingId)}`;
  const sampleEditUrl = `${base}/dashboard/listings/${encodeURIComponent(sampleListingId)}/edit`;
  const sampleDashboardUrl = `${base}/dashboard/listings`;
  const sampleVerifyUrl = `${base}/verify-email?token=sample-verification-token`;
  const sampleResetUrl = `${base}/reset-password?token=sample-reset-token`;
  const samplePreviewUrl = `${base}/listings/preview/sample-preview-token`;

  return [
    {
      key: "verify_email",
      group: "Account",
      label: "Welcome + Verify Email",
      description: "First email sent after a new user registers.",
      previewTo: currentAdminEmail || "admin@sailboattrade.com",
      ...buildVerifyEmailMessage({
        appUrl: base,
        verifyUrl: sampleVerifyUrl,
        displayName: currentAdminName || "Captain Morgan",
        reason: "signup",
      }),
    },
    {
      key: "verify_email_resend",
      group: "Account",
      label: "Resend Verification",
      description: "Verification reminder email sent from the dashboard or create-listing gate.",
      previewTo: currentAdminEmail || "admin@sailboattrade.com",
      ...buildVerifyEmailMessage({
        appUrl: base,
        verifyUrl: sampleVerifyUrl,
        displayName: currentAdminName || "Captain Morgan",
        reason: "resend",
      }),
    },
    {
      key: "password_reset",
      group: "Account",
      label: "Password Reset",
      description: "Secure account recovery email with expiring reset link.",
      previewTo: currentAdminEmail || "admin@sailboattrade.com",
      ...buildPasswordResetMessage({
        appUrl: base,
        resetUrl: sampleResetUrl,
        displayName: currentAdminName || "Captain Morgan",
        expiresInMinutes: 30,
      }),
    },
    {
      key: "listing_pending_admin_review",
      group: "Listings",
      label: "Admin Review Alert",
      description: "Internal alert that a submitted listing is waiting in the moderation queue.",
      previewTo: currentAdminEmail || "support@sailboattrade.com",
      ...buildAdminListingPendingReviewMessage({
        appUrl: base,
        listingTitle: "2020 Beneteau Oceanis 41.1",
        listingId: sampleListingId,
        ownerName: "Jordan Lee",
        ownerEmail: "jordan@example.com",
        reviewUrl: sampleReviewUrl,
        previewUrl: samplePreviewUrl,
        submittedAtIso: "2026-03-20T15:30:00.000Z",
        source: "checkout_capture",
      }),
    },
    {
      key: "listing_owner_pending_review",
      group: "Listings",
      label: "Owner Pending Review",
      description: "Confirmation that a paid listing is now waiting for admin review.",
      previewTo: currentAdminEmail || "admin@sailboattrade.com",
      ...buildOwnerListingPendingReviewMessage({
        appUrl: base,
        ownerName: currentAdminName || "Jordan Lee",
        listingTitle: "2020 Beneteau Oceanis 41.1",
        listingId: sampleListingId,
        listingUrl: sampleListingUrl,
        dashboardUrl: sampleDashboardUrl,
        source: "checkout_capture",
      }),
    },
    {
      key: "listing_owner_published",
      group: "Listings",
      label: "Owner Listing Published",
      description: "Celebratory confirmation that a listing is now live.",
      previewTo: currentAdminEmail || "admin@sailboattrade.com",
      ...buildOwnerListingPublishedMessage({
        appUrl: base,
        ownerName: currentAdminName || "Jordan Lee",
        listingTitle: "2020 Beneteau Oceanis 41.1",
        listingId: sampleListingId,
        listingUrl: sampleListingUrl,
        dashboardUrl: sampleDashboardUrl,
        editUrl: sampleEditUrl,
        source: "admin_approval",
      }),
    },
    {
      key: "listing_owner_rejected",
      group: "Listings",
      label: "Owner Changes Requested",
      description: "Sent when an admin returns a listing with comments that need to be fixed.",
      previewTo: currentAdminEmail || "admin@sailboattrade.com",
      ...buildOwnerListingRejectedMessage({
        appUrl: base,
        ownerName: currentAdminName || "Jordan Lee",
        listingTitle: "2020 Beneteau Oceanis 41.1",
        listingId: sampleListingId,
        dashboardUrl: sampleDashboardUrl,
        editUrl: sampleEditUrl,
        rejectionReason: "Please replace the hero photo, tighten the description, and confirm the asking price currency.",
        source: "admin_reject",
      }),
    },
    {
      key: "listing_inquiry_seller",
      group: "Inquiries",
      label: "Seller Inquiry Alert",
      description: "Message delivered to the seller when a buyer reaches out.",
      previewTo: currentAdminEmail || "seller@sailboattrade.com",
      ...buildSellerInquiryMessage({
        appUrl: base,
        listingTitle: "2020 Beneteau Oceanis 41.1",
        listingUrl: sampleListingUrl,
        buyerName: "Taylor Reed",
        buyerEmail: "taylor@example.com",
        buyerPhone: "+1 555-867-5309",
        message: "Hello, I am very interested in this boat. Is it still available, and do you have any additional photos of the cockpit and electronics package?",
      }),
    },
    {
      key: "listing_inquiry_buyer_confirmation",
      group: "Inquiries",
      label: "Buyer Inquiry Confirmation",
      description: "Confirmation message sent back to the buyer after they submit an inquiry.",
      previewTo: currentAdminEmail || "buyer@sailboattrade.com",
      ...buildBuyerInquiryConfirmationMessage({
        appUrl: base,
        buyerName: "Taylor Reed",
        sellerName: "Harbor Wind Yachts",
        listingTitle: "2020 Beneteau Oceanis 41.1",
        listingUrl: sampleListingUrl,
      }),
    },
  ];
}

export function getEmailPreviewByKey({ key, appUrl, currentAdminEmail, currentAdminName }) {
  return getEmailPreviewCatalog({ appUrl, currentAdminEmail, currentAdminName }).find(
    (item) => item.key === key,
  ) || null;
}
