const BRAND = {
  navy: "#0a2230",
  navySoft: "#15384d",
  gold: "#c8a44d",
  goldBright: "#f3b23f",
  goldSoft: "#f7ecd0",
  ink: "#13202b",
  slate: "#465967",
  line: "#d8e1e7",
  shell: "#f4f7f9",
  white: "#ffffff",
};

const PUBLIC_SITE_URL = "https://www.sailboattrade.com";
const BRAND_FONT =
  "'Libre Baskerville', Georgia, 'Times New Roman', Times, serif";
const BODY_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, Helvetica, sans-serif";

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

function pill(text) {
  return `
    <span style="display:inline-block;padding:7px 12px;border-radius:999px;background:${BRAND.goldSoft};color:#745300;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;">
      ${esc(text)}
    </span>
  `;
}

function ctaButton(label, href, tone = "gold") {
  const bg = tone === "navy" ? BRAND.navy : BRAND.gold;
  const color = tone === "navy" ? BRAND.white : BRAND.navy;
  const border = tone === "navy" ? BRAND.navy : BRAND.gold;
  return `
    <a href="${esc(href)}" style="display:inline-block;padding:13px 18px;border-radius:10px;border:1px solid ${border};background:${bg};color:${color};text-decoration:none;font-weight:700;font-size:15px;">
      ${esc(label)}
    </a>
  `;
}

function plainTextToHtml(value) {
  return esc(value).replaceAll("\n", "<br />");
}

function sectionBlock({ label, body }) {
  return `
    <div style="margin:0 0 18px;padding-top:18px;border-top:1px solid ${BRAND.line};">
      <div style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:.08em;color:${BRAND.slate};text-transform:uppercase;">
        ${esc(label)}
      </div>
      <div style="font-size:15px;line-height:1.65;color:${BRAND.ink};">
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

function summaryPanel({ title, body, tone = "gold" }) {
  const bg = tone === "navy" ? "#eef3f6" : "#fdf8ea";
  const border = tone === "navy" ? BRAND.line : "#ead49a";
  return `
    <div style="margin:0 0 24px;padding:18px 20px;border:1px solid ${border};border-radius:16px;background:${bg};">
      <div style="margin:0 0 7px;font-size:12px;font-weight:800;letter-spacing:.08em;color:${BRAND.slate};text-transform:uppercase;">
        ${esc(title)}
      </div>
      <div style="font-size:15px;line-height:1.65;color:${BRAND.ink};">
        ${body}
      </div>
    </div>
  `;
}

function brandWordmark() {
  return `
    <span style="font-family:${BRAND_FONT};font-weight:700;letter-spacing:.03em;white-space:nowrap;">
      <span style="color:${BRAND.white};">Sailboat</span><span style="color:${BRAND.goldBright};">Trade</span><span style="color:${BRAND.white};letter-spacing:.06em;">.com</span>
    </span>
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
}) {
  const assets = siteAssets(appUrl);
  const safeTitle = esc(title);
  const safePreheader = esc(preheader || "");
  const eyebrowHtml = eyebrow ? pill(eyebrow) : "";
  const primary = primaryCta ? ctaButton(primaryCta.label, primaryCta.href, primaryCta.tone) : "";
  const secondary = secondaryCta
    ? ctaButton(secondaryCta.label, secondaryCta.href, secondaryCta.tone || "navy")
    : "";
  const summaryHtml =
    heroTitle || heroBody
      ? summaryPanel({
          title: heroTitle || "Details",
          body: heroBody || "",
          tone: primaryCta?.tone === "navy" ? "navy" : "gold",
        })
      : "";
  const sectionsHtml = sections.join("");
  const linksHtml = links.join("");
  const footerHtml = footerNote
    ? `<div style="margin-top:14px;font-size:12px;line-height:1.6;color:${BRAND.slate};">${footerNote}</div>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      @media only screen and (max-width: 640px) {
        .sbt-shell {
          border-radius: 16px !important;
        }
        .sbt-pad {
          padding-left: 18px !important;
          padding-right: 18px !important;
        }
        .sbt-title {
          font-size: 24px !important;
        }
        .sbt-button a {
          display: block !important;
          margin: 0 0 12px 0 !important;
          text-align: center !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;background:${BRAND.shell};font-family:${BODY_FONT};color:${BRAND.ink};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${safePreheader}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.shell};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sbt-shell" style="max-width:640px;background:${BRAND.white};border-radius:20px;overflow:hidden;border:1px solid #dbe5ea;">
            <tr>
              <td class="sbt-pad" style="padding:20px 24px;background:${BRAND.navy};border-bottom:4px solid ${BRAND.gold};">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px;">
                      <img src="${esc(assets.logoUrl)}" width="64" alt="SailboatTrade burgee" style="display:block;border:0;width:64px;max-width:64px;height:auto;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <div style="font-size:26px;line-height:1.1;">${brandWordmark()}</div>
                      <div style="margin-top:4px;font-size:12px;font-weight:600;color:#e9f0f4;">All Sailboats, All the Time!</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="sbt-pad" style="padding:28px 24px 26px;">
                ${eyebrowHtml ? `<div style="margin:0 0 16px;">${eyebrowHtml}</div>` : ""}
                <h1 class="sbt-title" style="margin:0 0 12px;font-size:30px;line-height:1.2;color:${BRAND.navy};font-family:${BRAND_FONT};font-weight:700;">
                  ${esc(headline)}
                </h1>
                ${
                  intro
                    ? `<p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:${BRAND.ink};">${esc(intro)}</p>`
                    : ""
                }
                ${summaryHtml}
                ${sectionsHtml}
                ${
                  primary || secondary
                    ? `<div class="sbt-button" style="margin:24px 0 16px;">${primary}${primary && secondary ? `&nbsp;&nbsp;${secondary}` : secondary}</div>`
                    : ""
                }
                ${linksHtml}
                ${
                  notice
                    ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.65;color:${BRAND.slate};">${notice}</p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td class="sbt-pad" style="padding:16px 24px 22px;border-top:1px solid #e7edf1;background:#fbfdfe;">
                <div style="font-size:12px;line-height:1.65;color:${BRAND.slate};">
                  SailboatTrade.com
                </div>
                ${footerHtml}
                <div style="margin-top:10px;font-size:12px;color:${BRAND.slate};">
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
    preheader: "Confirm your email to activate your account.",
    eyebrow: isResend ? "Verification Reminder" : "Welcome Aboard",
    headline: isResend ? "Verify your email" : `Welcome to SailboatTrade, ${who}`,
    intro: isResend
      ? `Hi ${who}, please verify your email to activate your account and create listings.`
      : "Thanks for joining. Please verify your email to activate your account and create listings.",
    heroTitle: "Action required",
    heroBody: "Use the button below to confirm this email address and unlock your account.",
    sections: [
      sectionBlock({
        label: "Backup link",
        body: `<span style="word-break:break-all;color:${BRAND.navy};">${esc(verifyUrl)}</span>`,
      }),
    ],
    primaryCta: { label: "Verify Email", href: verifyUrl, tone: "gold" },
    notice: "If you did not create this account, you can ignore this email.",
    footerNote: "Need help? Reply to this email.",
    textLines: [
      isResend ? "Verify your email" : `Welcome to SailboatTrade, ${who}`,
      "Use the link below to activate your account.",
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
    headline: "Reset your password",
    intro: `Hi ${who}, we received a request to reset your password.`,
    heroTitle: "Important",
    heroBody: `This secure link expires in ${expiresInMinutes} minutes.`,
    sections: [
      sectionBlock({
        label: "Backup link",
        body: `<span style="word-break:break-all;color:${BRAND.navy};">${esc(resetUrl)}</span>`,
      }),
    ],
    primaryCta: { label: "Reset Password", href: resetUrl, tone: "gold" },
    notice: "If you did not request a password reset, you can ignore this email.",
    footerNote: "SailboatTrade support will never ask for your password by email.",
    textLines: [
      "Reset your SailboatTrade password",
      `Hi ${who}, use this secure link within ${expiresInMinutes} minutes: ${resetUrl}`,
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
    preheader: "A submitted listing is waiting in the admin queue.",
    eyebrow: "Admin Review",
    headline: "Listing pending review",
    intro: "A submitted listing is ready for moderation.",
    heroTitle: "Listing",
    heroBody: `<strong>${esc(listingTitle)}</strong><br />Listing ID: ${esc(listingId)}`,
    sections: [
      sectionBlock({
        label: "Owner",
        body: `${esc(ownerName)}<br /><a href="mailto:${esc(ownerEmail)}" style="color:${BRAND.navy};">${esc(ownerEmail)}</a>`,
      }),
      sectionBlock({
        label: "Submitted",
        body: `${esc(submittedAtIso)}<br />Source: ${esc(source)}`,
      }),
    ],
    primaryCta: { label: "Open Review Queue", href: reviewUrl, tone: "gold" },
    secondaryCta: { label: "Preview Listing", href: previewUrl, tone: "navy" },
    textLines: [
      "Listing pending admin review",
      `Listing: ${listingTitle}`,
      `Listing ID: ${listingId}`,
      `Owner: ${ownerName} (${ownerEmail})`,
      `Submitted: ${submittedAtIso}`,
      `Source: ${source}`,
      `Review: ${reviewUrl}`,
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
    subject: "Your listing is pending admin review",
    preheader: "Your listing has been submitted and is waiting for review.",
    eyebrow: "Listing Submitted",
    headline: "Your listing is pending review",
    intro: `Thank you, ${personName({ displayName: ownerName })}. Your listing has been received and is now in our review queue.`,
    heroTitle: "Listing",
    heroBody: `<strong>${esc(listingTitle)}</strong><br />Listing ID: ${esc(listingId)}`,
    sections: [
      sectionBlock({
        label: "What happens next",
        body: "We will review the listing and publish it once it is approved. If changes are needed, we will email you.",
      }),
      sectionBlock({
        label: "Source",
        body: esc(source),
      }),
    ],
    primaryCta: { label: "View Listing", href: listingUrl, tone: "gold" },
    secondaryCta: { label: "Open Dashboard", href: dashboardUrl, tone: "navy" },
    textLines: [
      "Your listing is pending review",
      `Listing: ${listingTitle}`,
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
    subject: "Your listing is now live on SailboatTrade",
    preheader: "Your listing has been approved and published.",
    eyebrow: "Listing Approved",
    headline: "Your listing is live",
    intro: `Congratulations, ${personName({ displayName: ownerName })}. Your listing is now visible to buyers on SailboatTrade.`,
    heroTitle: "Listing",
    heroBody: `<strong>${esc(listingTitle)}</strong><br />Listing ID: ${esc(listingId)}`,
    sections: [
      sectionBlock({
        label: "Next step",
        body: "Monitor inquiries and keep the listing details current from your dashboard.",
      }),
      sectionBlock({
        label: "Source",
        body: esc(source),
      }),
    ],
    primaryCta: { label: "View Live Listing", href: listingUrl, tone: "gold" },
    secondaryCta: { label: "Open Dashboard", href: dashboardUrl, tone: "navy" },
    links: [linkLine("Edit this listing", editUrl)],
    textLines: [
      "Your listing is now live on SailboatTrade",
      `Listing: ${listingTitle}`,
      `Listing ID: ${listingId}`,
      `View listing: ${listingUrl}`,
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
  const comments =
    rejectionReason || "Changes are required before this listing can be approved.";

  return createMessage({
    appUrl,
    subject: "Changes requested for your SailboatTrade listing",
    preheader: "Your listing needs updates before it can be approved.",
    eyebrow: "Changes Requested",
    headline: "Your listing needs updates",
    intro: `Hi ${personName({ displayName: ownerName })}, please make the requested changes and resubmit your listing.`,
    heroTitle: "Reviewer comments",
    heroBody: plainTextToHtml(comments),
    sections: [
      sectionBlock({
        label: "Listing",
        body: `<strong>${esc(listingTitle)}</strong><br />Listing ID: ${esc(listingId)}`,
      }),
      sectionBlock({
        label: "Source",
        body: esc(source),
      }),
    ],
    primaryCta: { label: "Edit Listing", href: editUrl, tone: "gold" },
    secondaryCta: { label: "Open Dashboard", href: dashboardUrl, tone: "navy" },
    notice: "If anything in the comments is unclear, reply to this email and we will help.",
    textLines: [
      "Changes requested for your listing",
      `Listing: ${listingTitle}`,
      `Listing ID: ${listingId}`,
      `Comments: ${comments}`,
      `Edit listing: ${editUrl}`,
      `Dashboard: ${dashboardUrl}`,
      `Source: ${source}`,
    ],
  });
}

export function buildListingRenewalReminderMessage({
  appUrl,
  ownerName,
  listingTitle,
  daysRemaining,
  expiresAtLabel,
  renewUrl,
  dashboardUrl,
  renewActionLabel,
  renewHelpText,
}) {
  const dayLabel = `${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;
  return createMessage({
    appUrl,
    subject: `Your listing expires in ${dayLabel}`,
    preheader: "Renew now to keep your listing active on SailboatTrade.",
    eyebrow: "Renewal Reminder",
    headline: "Your listing is expiring soon",
    intro: `Hi ${personName({ displayName: ownerName })}, your listing will expire in ${dayLabel}.`,
    heroTitle: "Listing",
    heroBody: `<strong>${esc(listingTitle)}</strong><br />Expires: ${esc(expiresAtLabel)}`,
    sections: [
      sectionBlock({
        label: "Next step",
        body: esc(renewHelpText),
      }),
    ],
    primaryCta: { label: renewActionLabel, href: renewUrl, tone: "gold" },
    secondaryCta: { label: "Open Dashboard", href: dashboardUrl, tone: "navy" },
    textLines: [
      `Your listing expires in ${dayLabel}`,
      `Listing: ${listingTitle}`,
      `Expires: ${expiresAtLabel}`,
      renewHelpText,
      `${renewActionLabel}: ${renewUrl}`,
      `Dashboard: ${dashboardUrl}`,
    ],
  });
}

export function buildListingExpiredMessage({
  appUrl,
  ownerName,
  listingTitle,
  expiredAtLabel,
  renewUrl,
  dashboardUrl,
  renewActionLabel,
  renewHelpText,
}) {
  return createMessage({
    appUrl,
    subject: "Your listing has expired",
    preheader: "Your listing has expired and needs to be renewed.",
    eyebrow: "Listing Expired",
    headline: "Your listing has expired",
    intro: `Hi ${personName({ displayName: ownerName })}, your listing is no longer active and needs to be renewed.`,
    heroTitle: "Listing",
    heroBody: `<strong>${esc(listingTitle)}</strong><br />Expired: ${esc(expiredAtLabel)}`,
    sections: [
      sectionBlock({
        label: "Next step",
        body: esc(renewHelpText),
      }),
    ],
    primaryCta: { label: renewActionLabel, href: renewUrl, tone: "gold" },
    secondaryCta: { label: "Open Dashboard", href: dashboardUrl, tone: "navy" },
    notice: "Expired listings are archived until they are renewed.",
    textLines: [
      "Your listing has expired",
      `Listing: ${listingTitle}`,
      `Expired: ${expiredAtLabel}`,
      renewHelpText,
      `${renewActionLabel}: ${renewUrl}`,
      `Dashboard: ${dashboardUrl}`,
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
  const phoneLine = buyerPhone ? `<br />Phone: ${esc(buyerPhone)}` : "";
  return createMessage({
    appUrl,
    subject: `New buyer inquiry for ${listingTitle} — SailboatTrade`,
    preheader: "A buyer sent you a message through your listing.",
    eyebrow: "Buyer Inquiry",
    headline: "You received a new inquiry",
    intro: "A buyer contacted you through your SailboatTrade listing.",
    heroTitle: "Buyer message",
    heroBody: plainTextToHtml(message),
    sections: [
      sectionBlock({
        label: "Buyer",
        body: `${esc(buyerName)}<br /><a href="mailto:${esc(buyerEmail)}" style="color:${BRAND.navy};">${esc(buyerEmail)}</a>${phoneLine}`,
      }),
      sectionBlock({
        label: "Listing",
        body: `<strong>${esc(listingTitle)}</strong>`,
      }),
    ],
    primaryCta: { label: "View Listing", href: listingUrl, tone: "gold" },
    notice: "You can reply directly to this email to respond to the buyer.",
    textLines: [
      `New buyer inquiry for ${listingTitle}`,
      `Buyer: ${buyerName}`,
      `Buyer email: ${buyerEmail}`,
      buyerPhone ? `Buyer phone: ${buyerPhone}` : "Buyer phone: Not provided",
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
    subject: `Your inquiry for ${listingTitle} has been sent`,
    preheader: "Your inquiry has been delivered to the seller.",
    eyebrow: "Inquiry Sent",
    headline: "Your message has been sent",
    intro: `Thanks, ${personName({ displayName: buyerName })}. ${sellerName} has been notified.`,
    heroTitle: "Listing",
    heroBody: `<strong>${esc(listingTitle)}</strong>`,
    sections: [
      sectionBlock({
        label: "What to expect",
        body: "The seller can reply directly to the email address you provided.",
      }),
    ],
    primaryCta: { label: "View Listing", href: listingUrl, tone: "gold" },
    links: [linkLine("Browse more sailboats", `${normalizeUrl(appUrl)}/listings`)],
    notice: "If you do not hear back right away, the seller may simply be away from their inbox.",
    textLines: [
      "Your inquiry has been sent",
      `${sellerName} has been notified about your interest in ${listingTitle}.`,
      `View listing: ${listingUrl}`,
    ],
  });
}

export function buildAdminUserMessageEmail({
  appUrl,
  recipientName,
  adminName,
  subject,
  message,
}) {
  const who = personName({ displayName: recipientName });
  const fromName = String(adminName || "SailboatTrade Support").trim();
  return createMessage({
    appUrl,
    subject,
    preheader: "A message from the SailboatTrade team.",
    eyebrow: "Support Message",
    headline: `Hello ${who},`,
    intro: "A member of the SailboatTrade team sent you the message below.",
    heroTitle: "Message",
    heroBody: plainTextToHtml(message),
    sections: [
      sectionBlock({
        label: "Sent by",
        body: esc(fromName),
      }),
    ],
    links: [linkLine("Visit SailboatTrade.com", normalizeUrl(appUrl) || PUBLIC_SITE_URL)],
    textLines: [
      `Hello ${who},`,
      "A member of the SailboatTrade team sent you the message below.",
      `Subject: ${subject}`,
      message,
      `Sent by: ${fromName}`,
      `Website: ${normalizeUrl(appUrl) || PUBLIC_SITE_URL}`,
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
      description: "Confirmation that a listing is now live.",
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
    {
      key: "listing_renewal_reminder",
      group: "Listings",
      label: "Renewal Reminder",
      description: "Reminder sent in the 5 days before a listing expires.",
      previewTo: currentAdminEmail || "owner@sailboattrade.com",
      ...buildListingRenewalReminderMessage({
        appUrl: base,
        ownerName: currentAdminName || "Jordan Lee",
        listingTitle: "2020 Beneteau Oceanis 41.1",
        daysRemaining: 3,
        expiresAtLabel: "March 27, 2026",
        renewUrl: `${base}/checkout/${encodeURIComponent(sampleListingId)}`,
        dashboardUrl: sampleDashboardUrl,
        renewActionLabel: "Renew Listing",
        renewHelpText: "Use the button below to renew this paid listing and keep it visible to buyers.",
      }),
    },
    {
      key: "listing_expired",
      group: "Listings",
      label: "Listing Expired",
      description: "Sent once a listing has expired.",
      previewTo: currentAdminEmail || "owner@sailboattrade.com",
      ...buildListingExpiredMessage({
        appUrl: base,
        ownerName: currentAdminName || "Jordan Lee",
        listingTitle: "2020 Beneteau Oceanis 41.1",
        expiredAtLabel: "March 27, 2026",
        renewUrl: `${base}/checkout/${encodeURIComponent(sampleListingId)}`,
        dashboardUrl: sampleDashboardUrl,
        renewActionLabel: "Renew Listing",
        renewHelpText: "Use the button below to renew this paid listing and return it to the marketplace.",
      }),
    },
    {
      key: "admin_user_message",
      group: "Admin",
      label: "Admin User Message",
      description: "Direct support message sent from an admin to a user.",
      previewTo: currentAdminEmail || "member@sailboattrade.com",
      ...buildAdminUserMessageEmail({
        appUrl: base,
        recipientName: "Taylor Reed",
        adminName: currentAdminName || "Harbor Support",
        subject: "We updated your account",
        message: "We made the requested update to your account. If anything still looks off, just reply to this email and we will take another look.",
      }),
    },
  ];
}

export function getEmailPreviewByKey({ key, appUrl, currentAdminEmail, currentAdminName }) {
  return getEmailPreviewCatalog({ appUrl, currentAdminEmail, currentAdminName }).find(
    (item) => item.key === key,
  ) || null;
}
