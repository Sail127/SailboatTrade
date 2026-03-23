import prisma from "@/lib/prisma";
import { getAppUrl, sendEmail, sendEmailWithRetry } from "@/lib/email";
import {
  buildAdminListingSoldReportMessage,
  buildAdminListingPendingReviewMessage,
  buildListingExpiredMessage,
  buildListingRenewalReminderMessage,
  buildOwnerListingUpgradeConfirmationMessage,
  buildOwnerListingPendingReviewMessage,
  buildOwnerListingPublishedMessage,
  buildOwnerListingRejectedMessage,
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

function isPaidListing(listing) {
  const addons = Array.isArray(listing?.billingAddons) ? listing.billingAddons : [];
  return listing?.photoPlan === "PHOTO_PLUS_25" || !!listing?.featuredHome || addons.length > 0;
}

function renewalActionDetails({ appUrl, listingId, listing }) {
  const paid = isPaidListing(listing);
  return {
    renewUrl: paid
      ? `${appUrl}/checkout/${encodeURIComponent(listingId)}`
      : `${appUrl}/dashboard/listings`,
    dashboardUrl: `${appUrl}/dashboard/listings`,
    renewActionLabel: paid ? "Renew Listing" : "Open Dashboard",
    renewHelpText: paid
      ? "Use the button below to renew this paid listing and keep it visible to buyers."
      : "Open your dashboard and click Renew for this listing to keep it active.",
  };
}

function formatDateLong(date) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  } catch {
    return new Date(date).toISOString().slice(0, 10);
  }
}

function formatMoney(cents, currency = "USD") {
  const amount = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency || "USD").toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${String(currency || "USD").toUpperCase()} ${amount.toFixed(2)}`;
  }
}

function upgradeSummary({ photoPlus, featuredHome, termMonths }) {
  const parts = [];
  if (photoPlus) parts.push("Photo Plus (up to 25 photos)");
  if (featuredHome) parts.push("Featured Home placement");
  if (termMonths) parts.push(`${termMonths} month term`);
  return parts.join(" • ") || "Listing upgrade";
}

function statusSummary(status) {
  const value = String(status || "").toUpperCase();
  if (value === "PENDING_REVIEW") {
    return "Your upgraded listing is now in admin review and will go live after approval.";
  }
  if (value === "PUBLISHED") {
    return "Your upgraded listing is live now and visible to buyers.";
  }
  return `Your listing status is currently ${value || "UNKNOWN"}.`;
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

    await sendEmailWithRetry({
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

    await sendEmailWithRetry({
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

export async function notifyOwnerListingUpgradeConfirmation({
  req,
  listingId,
  photoPlus = false,
  featuredHome = false,
  termMonths = 1,
  totalCents = 0,
  currency = "USD",
  nextStatus = "",
  source = "unknown",
}) {
  try {
    const id = String(listingId || "").trim();
    if (!id) return { ok: false, skipped: "missing_id" };

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
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

    const ownerEmail = String(listing.owner?.email || "").trim();
    if (!ownerEmail) return { ok: false, skipped: "missing_owner_email" };

    const ownerName = String(listing.owner?.name || "").trim() || "there";
    const listingTitle = titleFromListing(listing);
    const appUrl = getAppUrl(req);
    const listingUrl = `${appUrl}/listings/${encodeURIComponent(id)}`;
    const dashboardUrl = `${appUrl}/dashboard/listings`;
    const message = buildOwnerListingUpgradeConfirmationMessage({
      appUrl,
      ownerName,
      listingTitle,
      listingId: id,
      dashboardUrl,
      listingUrl,
      checkoutLabel: `Term: ${termMonths} month${Number(termMonths) === 1 ? "" : "s"}`,
      upgradeSummary: upgradeSummary({ photoPlus, featuredHome, termMonths }),
      totalLabel: `Total paid: ${formatMoney(totalCents, currency)}`,
      statusSummary: statusSummary(nextStatus),
      source,
    });

    await sendEmailWithRetry({
      to: ownerEmail,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [{ name: "type", value: "listing_owner_upgrade_confirmation" }],
    });

    return { ok: true };
  } catch (err) {
    console.error("notifyOwnerListingUpgradeConfirmation failed", {
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

export async function notifyOwnerListingRejected({
  req,
  listingId,
  rejectionReason,
  source = "unknown",
}) {
  try {
    const id = String(listingId || "").trim();
    const reason = String(rejectionReason || "").trim();
    if (!id) return { ok: false, skipped: "missing_id" };
    if (!reason) return { ok: false, skipped: "missing_reason" };

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
    if (String(listing.status || "").toUpperCase() !== "REJECTED") {
      return { ok: false, skipped: "not_rejected" };
    }

    const ownerEmail = String(listing.owner?.email || "").trim();
    if (!ownerEmail) return { ok: false, skipped: "missing_owner_email" };

    const ownerName = String(listing.owner?.name || "").trim() || "there";
    const listingTitle = titleFromListing(listing);
    const appUrl = getAppUrl(req);
    const dashboardUrl = `${appUrl}/dashboard/listings`;
    const editUrl = `${appUrl}/dashboard/listings/${encodeURIComponent(id)}/edit`;

    const message = buildOwnerListingRejectedMessage({
      appUrl,
      ownerName,
      listingTitle,
      listingId: id,
      dashboardUrl,
      editUrl,
      rejectionReason: reason,
      source,
    });

    await sendEmail({
      to: ownerEmail,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [{ name: "type", value: "listing_owner_rejected" }],
    });

    return { ok: true };
  } catch (err) {
    console.error("notifyOwnerListingRejected failed", {
      listingId: String(listingId || ""),
      source: String(source || ""),
      error: err?.message || String(err || "unknown_error"),
    });
    return { ok: false, error: err?.message || "notification_failed" };
  }
}

export async function notifyOwnerListingRenewalReminder({
  req,
  listingId,
  daysRemaining,
  source = "unknown",
}) {
  try {
    const id = String(listingId || "").trim();
    const days = Number(daysRemaining);
    if (!id) return { ok: false, skipped: "missing_id" };
    if (!Number.isFinite(days) || days < 1) return { ok: false, skipped: "invalid_days_remaining" };

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        title: true,
        year: true,
        builder: true,
        model: true,
        photoPlan: true,
        featuredHome: true,
        billingAddons: true,
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
    if (!listing.expiresAt) return { ok: false, skipped: "missing_expires_at" };

    const ownerEmail = String(listing.owner?.email || "").trim();
    if (!ownerEmail) return { ok: false, skipped: "missing_owner_email" };

    const ownerName = String(listing.owner?.name || "").trim() || "there";
    const listingTitle = titleFromListing(listing);
    const appUrl = getAppUrl(req);
    const action = renewalActionDetails({ appUrl, listingId: id, listing });
    const message = buildListingRenewalReminderMessage({
      appUrl,
      ownerName,
      listingTitle,
      daysRemaining: days,
      expiresAtLabel: formatDateLong(listing.expiresAt),
      renewUrl: action.renewUrl,
      dashboardUrl: action.dashboardUrl,
      renewActionLabel: action.renewActionLabel,
      renewHelpText: action.renewHelpText,
    });

    await sendEmailWithRetry({
      to: ownerEmail,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [{ name: "type", value: "listing_renewal_reminder" }],
    });

    return { ok: true };
  } catch (err) {
    console.error("notifyOwnerListingRenewalReminder failed", {
      listingId: String(listingId || ""),
      source: String(source || ""),
      daysRemaining: Number(daysRemaining),
      error: err?.message || String(err || "unknown_error"),
    });
    return { ok: false, error: err?.message || "notification_failed" };
  }
}

export async function notifyOwnerListingExpired({
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
        expiresAt: true,
        title: true,
        year: true,
        builder: true,
        model: true,
        photoPlan: true,
        featuredHome: true,
        billingAddons: true,
        owner: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!listing) return { ok: false, skipped: "not_found" };
    if (!["PUBLISHED", "ARCHIVED"].includes(String(listing.status || "").toUpperCase())) {
      return { ok: false, skipped: "not_expirable_status" };
    }
    if (!listing.expiresAt) return { ok: false, skipped: "missing_expires_at" };

    const ownerEmail = String(listing.owner?.email || "").trim();
    if (!ownerEmail) return { ok: false, skipped: "missing_owner_email" };

    const ownerName = String(listing.owner?.name || "").trim() || "there";
    const listingTitle = titleFromListing(listing);
    const appUrl = getAppUrl(req);
    const action = renewalActionDetails({ appUrl, listingId: id, listing });
    const message = buildListingExpiredMessage({
      appUrl,
      ownerName,
      listingTitle,
      expiredAtLabel: formatDateLong(listing.expiresAt),
      renewUrl: action.renewUrl,
      dashboardUrl: action.dashboardUrl,
      renewActionLabel: action.renewActionLabel,
      renewHelpText: action.renewHelpText.replace("keep it active", "return it to the marketplace"),
    });

    await sendEmailWithRetry({
      to: ownerEmail,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [{ name: "type", value: "listing_expired" }],
    });

    return { ok: true };
  } catch (err) {
    console.error("notifyOwnerListingExpired failed", {
      listingId: String(listingId || ""),
      source: String(source || ""),
      error: err?.message || String(err || "unknown_error"),
    });
    return { ok: false, error: err?.message || "notification_failed" };
  }
}

export async function notifyAdminListingSoldReport({
  req,
  listingId,
  soldOnSailboatTrade = false,
  feedback = "",
  source = "unknown",
}) {
  try {
    const id = String(listingId || "").trim();
    if (!id) return { ok: false, skipped: "missing_id" };

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
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

    const ownerEmail = String(listing.owner?.email || "").trim() || "Not available";
    const ownerName = String(listing.owner?.name || "").trim() || "Unknown owner";
    const listingTitle = titleFromListing(listing);
    const appUrl = getAppUrl(req);
    const dashboardUrl = `${appUrl}/dashboard/admin/active-listings?q=${encodeURIComponent(id)}`;

    const message = buildAdminListingSoldReportMessage({
      appUrl,
      ownerName,
      ownerEmail,
      listingTitle,
      listingId: id,
      soldOnSailboatTrade: Boolean(soldOnSailboatTrade),
      feedback: String(feedback || "").trim(),
      dashboardUrl,
    });

    await sendEmailWithRetry({
      to: adminToAddress(),
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [{ name: "type", value: "listing_sold_report" }],
    });

    return { ok: true };
  } catch (err) {
    console.error("notifyAdminListingSoldReport failed", {
      listingId: String(listingId || ""),
      source: String(source || ""),
      soldOnSailboatTrade: Boolean(soldOnSailboatTrade),
      error: err?.message || String(err || "unknown_error"),
    });
    return { ok: false, error: err?.message || "notification_failed" };
  }
}
