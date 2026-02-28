import prisma from "@/lib/prisma";
import { getAppUrl, sendEmail } from "@/lib/email";

const FALLBACK_ADMIN_REVIEW_EMAIL = "support@sailboattrade.com";

function esc(v) {
  return String(v || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function titleFromListing(listing) {
  const year = listing?.year != null ? String(listing.year) : "";
  const builder = String(listing?.builder || "").trim();
  const model = String(listing?.model || "").trim();
  const fallback = String(listing?.title || "Listing").trim();
  return [year, builder, model].filter(Boolean).join(" ") || fallback;
}

function adminToAddress() {
  return (
    String(process.env.ADMIN_REVIEW_EMAIL || "").trim() ||
    String(process.env.SUPPORT_EMAIL || "").trim() ||
    FALLBACK_ADMIN_REVIEW_EMAIL
  );
}

export async function notifyAdminListingPendingReview({
  req,
  listingId,
  source = "unknown",
}) {
  try {
    const id = String(listingId || "").trim();
    if (!id) return { ok: false, skipped: "missing_id" };

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        title: true,
        year: true,
        builder: true,
        model: true,
        previewToken: true,
        contentSubmittedAt: true,
        owner: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!listing) return { ok: false, skipped: "not_found" };
    if (String(listing.status || "").toUpperCase() !== "PENDING_REVIEW") {
      return { ok: false, skipped: "not_pending_review" };
    }

    const appUrl = getAppUrl(req);
    const reviewPath = `/dashboard/admin/review/${encodeURIComponent(id)}`;
    const reviewUrl = `${appUrl}${reviewPath}`;

    const previewPath = listing.previewToken
      ? `/listings/preview/${encodeURIComponent(String(listing.previewToken))}`
      : `/listings/${encodeURIComponent(id)}`;
    const previewUrl = `${appUrl}${previewPath}`;

    const listingTitle = titleFromListing(listing);
    const ownerEmail = String(listing.owner?.email || "").trim() || "Not available";
    const ownerName = String(listing.owner?.name || "").trim() || "Not available";
    const submittedAtIso = listing.contentSubmittedAt
      ? new Date(listing.contentSubmittedAt).toISOString()
      : new Date().toISOString();

    const listingTitleSafe = esc(listingTitle);
    const ownerEmailSafe = esc(ownerEmail);
    const ownerNameSafe = esc(ownerName);
    const sourceSafe = esc(source);
    const reviewUrlSafe = esc(reviewUrl);
    const previewUrlSafe = esc(previewUrl);
    const submittedAtSafe = esc(submittedAtIso);

    await sendEmail({
      to: adminToAddress(),
      subject: `Listing pending admin review: ${listingTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2 style="margin: 0 0 10px;">Listing pending admin review</h2>
          <p style="margin: 0 0 8px;"><strong>Listing:</strong> ${listingTitleSafe}</p>
          <p style="margin: 0 0 8px;"><strong>Listing ID:</strong> ${esc(id)}</p>
          <p style="margin: 0 0 8px;"><strong>Owner:</strong> ${ownerNameSafe} (${ownerEmailSafe})</p>
          <p style="margin: 0 0 8px;"><strong>Submitted at:</strong> ${submittedAtSafe}</p>
          <p style="margin: 0 0 12px;"><strong>Source:</strong> ${sourceSafe}</p>
          <p style="margin: 12px 0 8px;">
            <a href="${reviewUrlSafe}" style="display:inline-block;background:#0a2230;color:#ffffff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700;">
              Preview and approve
            </a>
          </p>
          <p style="margin: 0;">
            <a href="${previewUrlSafe}" style="color:#1d4ed8;text-decoration:underline;">Open raw preview</a>
          </p>
        </div>
      `,
      text: `Listing pending admin review

Listing: ${listingTitle}
Listing ID: ${id}
Owner: ${ownerName} (${ownerEmail})
Submitted at: ${submittedAtIso}
Source: ${source}

Preview and approve: ${reviewUrl}
Raw preview: ${previewUrl}`,
      tags: [{ name: "type", value: "listing_pending_admin_review" }],
    });

    return { ok: true };
  } catch (err) {
    console.error("notifyAdminListingPendingReview failed", {
      listingId: String(listingId || ""),
      source: String(source || ""),
      error: err?.message || String(err || "unknown_error"),
    });
    return { ok: false, error: err?.message || "notification_failed" };
  }
}

export async function notifyOwnerListingPendingReviewAfterPurchase({
  req,
  listingId,
  source = "unknown",
}) {
  try {
    const id = String(listingId || "").trim();
    if (!id) return { ok: false, skipped: "missing_id" };

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        title: true,
        year: true,
        builder: true,
        model: true,
        owner: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!listing) return { ok: false, skipped: "not_found" };
    if (String(listing.status || "").toUpperCase() !== "PENDING_REVIEW") {
      return { ok: false, skipped: "not_pending_review" };
    }

    const ownerEmail = String(listing.owner?.email || "").trim();
    if (!ownerEmail) return { ok: false, skipped: "missing_owner_email" };

    const ownerName = String(listing.owner?.name || "").trim() || "there";
    const listingTitle = titleFromListing(listing);
    const appUrl = getAppUrl(req);
    const listingUrl = `${appUrl}/listings/${encodeURIComponent(id)}`;
    const dashboardUrl = `${appUrl}/dashboard/listings`;

    const ownerNameSafe = esc(ownerName);
    const listingTitleSafe = esc(listingTitle);
    const listingIdSafe = esc(id);
    const listingUrlSafe = esc(listingUrl);
    const dashboardUrlSafe = esc(dashboardUrl);
    const sourceSafe = esc(source);

    await sendEmail({
      to: ownerEmail,
      subject: `Thank you - your listing is pending admin review`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2 style="margin: 0 0 10px;">Thank you for your purchase</h2>
          <p style="margin: 0 0 8px;">Hi ${ownerNameSafe},</p>
          <p style="margin: 0 0 8px;">
            We received your payment for <strong>${listingTitleSafe}</strong>.
          </p>
          <p style="margin: 0 0 8px;">
            Your listing is now pending admin review before it goes live. Review typically completes within 24 hours.
          </p>
          <p style="margin: 0 0 8px;">
            If changes are needed, we will send a reason and return the listing to draft so you can update and resubmit.
          </p>
          <p style="margin: 0 0 12px;"><strong>Listing ID:</strong> ${listingIdSafe}</p>
          <p style="margin: 12px 0 8px;">
            <a href="${listingUrlSafe}" style="display:inline-block;background:#0a2230;color:#ffffff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700;">
              View listing
            </a>
          </p>
          <p style="margin: 0;">
            <a href="${dashboardUrlSafe}" style="color:#1d4ed8;text-decoration:underline;">Open listings dashboard</a>
          </p>
          <p style="margin: 12px 0 0;color:#64748b;font-size:12px;">Source: ${sourceSafe}</p>
        </div>
      `,
      text: `Thank you for your purchase

Hi ${ownerName},

We received your payment for ${listingTitle}.
Your listing is now pending admin review before it goes live. Review typically completes within 24 hours.
If changes are needed, we will send a reason and return the listing to draft so you can update and resubmit.

Listing ID: ${id}
View listing: ${listingUrl}
Open listings dashboard: ${dashboardUrl}

Source: ${source}`,
      tags: [{ name: "type", value: "listing_owner_pending_review_after_purchase" }],
    });

    return { ok: true };
  } catch (err) {
    console.error("notifyOwnerListingPendingReviewAfterPurchase failed", {
      listingId: String(listingId || ""),
      source: String(source || ""),
      error: err?.message || String(err || "unknown_error"),
    });
    return { ok: false, error: err?.message || "notification_failed" };
  }
}
