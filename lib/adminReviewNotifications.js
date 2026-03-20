import prisma from "@/lib/prisma";
import { getAppUrl, sendEmail } from "@/lib/email";
import {
  buildAdminListingPendingReviewMessage,
  buildOwnerListingPendingReviewMessage,
  buildOwnerListingPublishedMessage,
} from "@/lib/email/templates";

const FALLBACK_ADMIN_REVIEW_EMAIL = "support@sailboattrade.com";

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

    const message = buildAdminListingPendingReviewMessage({
      appUrl,
      listingTitle,
      listingId: id,
      ownerName,
      ownerEmail,
      reviewUrl,
      previewUrl,
      submittedAtIso,
      source,
    });

    await sendEmail({
      to: adminToAddress(),
      subject: message.subject,
      html: message.html,
      text: message.text,
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

    const message = buildOwnerListingPendingReviewMessage({
      appUrl,
      ownerName,
      listingTitle,
      listingId: id,
      listingUrl,
      dashboardUrl,
      source,
    });

    await sendEmail({
      to: ownerEmail,
      subject: message.subject,
      html: message.html,
      text: message.text,
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

export async function notifyOwnerListingPublished({
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
    if (String(listing.status || "").toUpperCase() !== "PUBLISHED") {
      return { ok: false, skipped: "not_published" };
    }

    const ownerEmail = String(listing.owner?.email || "").trim();
    if (!ownerEmail) return { ok: false, skipped: "missing_owner_email" };

    const ownerName = String(listing.owner?.name || "").trim() || "there";
    const listingTitle = titleFromListing(listing);
    const appUrl = getAppUrl(req);
    const listingUrl = `${appUrl}/listings/${encodeURIComponent(id)}`;
    const dashboardUrl = `${appUrl}/dashboard/listings`;
    const editUrl = `${appUrl}/dashboard/listings/${encodeURIComponent(id)}/edit`;

    const message = buildOwnerListingPublishedMessage({
      appUrl,
      ownerName,
      listingTitle,
      listingId: id,
      listingUrl,
      dashboardUrl,
      editUrl,
      source,
    });

    await sendEmail({
      to: ownerEmail,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [{ name: "type", value: "listing_owner_published" }],
    });

    return { ok: true };
  } catch (err) {
    console.error("notifyOwnerListingPublished failed", {
      listingId: String(listingId || ""),
      source: String(source || ""),
      error: err?.message || String(err || "unknown_error"),
    });
    return { ok: false, error: err?.message || "notification_failed" };
  }
}
