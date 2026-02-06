// app/api/listings/[id]/route.js
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_CURRENCIES = new Set(["USD", "EUR", "GBP", "AUD", "NZD", "JPY", "CAD"]);

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function toStr(v, maxLen = 500) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function toInt(v, { min = 0, max = 2_000_000_000 } = {}) {
  if (v === "" || v == null) return null;
  const raw = String(v).replace(/[^\d-]/g, "");
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function isValidEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function arraysEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (String(a[i]) !== String(b[i])) return false;
  return true;
}

export async function GET(req, { params }) {
  const s = await requireUser();

  const listing = await prisma.listing.findFirst({
    where: { id: params.id, ownerId: s.uid },
  });

  if (!listing) return Response.json({ ok: false, error: "Not found." }, { status: 404 });
  return Response.json({ ok: true, listing });
}

export async function PUT(req, { params }) {
  const s = await requireUser();
  const body = await req.json().catch(() => ({}));

  const listing = await prisma.listing.findFirst({
    where: { id: params.id, ownerId: s.uid },
  });

  if (!listing) return Response.json({ ok: false, error: "Not found." }, { status: 404 });

  if (String(listing.status).toUpperCase() === "REMOVED") {
    return Response.json({ ok: false, error: "This listing was removed." }, { status: 403 });
  }

  const status = String(listing.status || "").toUpperCase();
  const paymentStatus = String(listing.paymentStatus || "").toUpperCase();
  const isPublished = status === "PUBLISHED";

  // --------- Read incoming fields safely (partial update friendly) ----------
  const nextTitle = has(body, "title") ? (toStr(body.title, 120) || null) : (listing.title ?? null);
  const nextDescription = has(body, "description") ? (toStr(body.description, 12_000) || null) : (listing.description ?? null);

  const nextPrice = has(body, "price") ? toInt(body.price, { min: 0, max: 2_000_000_000 }) : listing.price;

  const nextCurrency = (() => {
    if (!has(body, "currency")) return listing.currency || "USD";
    const c = toStr(body.currency, 8).toUpperCase();
    return (ALLOWED_CURRENCIES.has(c) ? c : "") || listing.currency || "USD";
  })();

  const nextLocationCountry = has(body, "locationCountry") ? (toStr(body.locationCountry, 60) || null) : (listing.locationCountry ?? null);
  const nextLocationCity = has(body, "locationCity") ? (toStr(body.locationCity, 60) || null) : (listing.locationCity ?? null);
  const nextLocationState = has(body, "locationState") ? (toStr(body.locationState, 60) || null) : (listing.locationState ?? null);
  const nextLocationUsRegion = has(body, "locationUsRegion") ? (toStr(body.locationUsRegion, 60) || null) : (listing.locationUsRegion ?? null);

  const nextListingContactName = has(body, "listingContactName")
    ? (toStr(body.listingContactName, 80) || null)
    : (listing.listingContactName ?? null);

  const nextContactEmail = has(body, "contactEmail") ? (toStr(body.contactEmail, 120) || null) : (listing.contactEmail ?? null);
  const nextContactPhone = has(body, "contactPhone") ? (toStr(body.contactPhone, 40) || null) : (listing.contactPhone ?? null);

  if (!isValidEmail(nextContactEmail)) {
    return Response.json({ ok: false, error: "Please enter a valid contact email." }, { status: 400 });
  }

  // Images are optional; only considered changed if provided
  const nextHeroImageUrl = has(body, "heroImageUrl")
    ? (toStr(body.heroImageUrl, 500) || null)
    : undefined;

  const nextImageUrls = has(body, "imageUrls") && Array.isArray(body.imageUrls)
    ? body.imageUrls
        .filter(Boolean)
        .map((x) => String(x).trim())
        .filter((x) => x.length > 0)
        .slice(0, 30)
    : undefined;

  // --------- MINOR updates: apply immediately even if published ----------
  const minorData = {
    price: nextPrice,
    currency: nextCurrency,

    locationCountry: nextLocationCountry,
    locationCity: nextLocationCity,
    locationState: nextLocationState,
    locationUsRegion: nextLocationUsRegion,

    listingContactName: nextListingContactName,
    contactEmail: nextContactEmail,
    contactPhone: nextContactPhone,
  };

  // --------- MAJOR updates: require re-approval ONLY when published ----------
  const majorChanged =
    (has(body, "title") && nextTitle !== (listing.title ?? null)) ||
    (has(body, "description") && nextDescription !== (listing.description ?? null)) ||
    (nextHeroImageUrl !== undefined && nextHeroImageUrl !== (listing.heroImageUrl ?? null)) ||
    (nextImageUrls !== undefined && !arraysEqual(nextImageUrls, listing.imageUrls || []));

  const data = { ...minorData };

  if (!isPublished) {
    // Unpublished listings: apply everything directly
    if (has(body, "title")) data.title = nextTitle;
    if (has(body, "description")) data.description = nextDescription;

    if (nextHeroImageUrl !== undefined) data.heroImageUrl = nextHeroImageUrl;
    if (nextImageUrls !== undefined) data.imageUrls = nextImageUrls;

    // If they edit while in new-listing pending review, bump timestamp so admin sees it as fresh
    if (status === "PENDING_REVIEW" && paymentStatus === "PAID") {
      data.submittedForReviewAt = new Date();
    }
  } else {
    // Published listings: stage major changes for admin approval
    if (majorChanged) {
      if (has(body, "title")) data.pendingTitle = nextTitle;
      if (has(body, "description")) data.pendingDescription = nextDescription;
      if (nextHeroImageUrl !== undefined) data.pendingHeroImageUrl = nextHeroImageUrl;
      if (nextImageUrls !== undefined) data.pendingImageUrls = nextImageUrls;

      data.contentReviewStatus = "PENDING";
      data.contentSubmittedAt = new Date();
      data.contentRejectionReason = null;
    }
    // Live title/desc/images remain unchanged until admin approves
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data,
  });

  return Response.json({
    ok: true,
    listing: updated,
    majorChanged: Boolean(isPublished && majorChanged),
    contentReviewStatus: updated.contentReviewStatus,
  });
}
