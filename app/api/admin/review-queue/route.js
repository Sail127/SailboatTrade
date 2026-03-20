// app/api/admin/review-queue/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function titleFromListing(l) {
  const year = l?.year != null ? String(l.year) : "";
  const builder = String(l?.builder || "").trim();
  const model = String(l?.model || "").trim();
  const fallback = String(l?.title || "Listing").trim();
  return [year, builder, model].filter(Boolean).join(" ") || fallback;
}

function planLabelFromListing(l) {
  const addons = Array.isArray(l?.billingAddons) ? l.billingAddons : [];

  const hasPhotoPlus = l?.photoPlan === "PHOTO_PLUS_25" || addons.includes("PHOTO_PLUS_25");
  const hasFeatured = !!l?.featuredHome || addons.includes("FEATURED_HOME");

  const parts = [];
  parts.push(hasPhotoPlus ? "Photo Plus (25)" : "Free (3)");
  if (hasFeatured) parts.push("Featured Home");

  if (l?.billingStatus === "ACTIVE") parts.push("Paid");
  else if (addons.length > 0 && l?.billingStatus !== "ACTIVE") parts.push("Checkout required");

  return parts.join(" • ");
}

function normalizeChangedSections(meta) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  const raw = meta.changedSections;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x || "").trim()).filter(Boolean);
}

export async function GET() {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const items = await prisma.listing.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: [{ contentSubmittedAt: "asc" }, { updatedAt: "asc" }],
    take: 50,
    select: {
      id: true,
      ownerId: true,
      title: true,
      year: true,
      builder: true,
      model: true,
      photoPlan: true,
      featuredHome: true,
      billingStatus: true,
      billingAddons: true,
      contentSubmittedAt: true,
      lastPaidAt: true,
      previewToken: true,
      price: true,
      currency: true,
      locationCity: true,
      locationState: true,
      locationCountry: true,
      heroImageUrl: true,
      imageUrls: true,
      createdAt: true,
    },
  });

  // Avoid assuming relation name; hydrate owner email separately
  const ownerIds = Array.from(new Set(items.map((x) => x.ownerId).filter(Boolean)));
  const users = ownerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, email: true, name: true },
      })
    : [];

  const userById = new Map(users.map((u) => [u.id, u]));
  const listingIds = items.map((x) => String(x.id || "")).filter(Boolean);

  const submissionLogs = listingIds.length
    ? await prisma.adminAuditLog.findMany({
        where: {
          entityType: "Listing",
          entityId: { in: listingIds },
          action: { in: ["LISTING_CHANGE_REAPPROVAL_SUBMIT", "LISTING_NEW_REVIEW_SUBMIT"] },
        },
        orderBy: { createdAt: "desc" },
        select: { entityId: true, action: true, meta: true, createdAt: true },
      })
    : [];

  const latestLogByListingId = new Map();
  for (const log of submissionLogs) {
    const entityId = String(log.entityId || "");
    if (!entityId || latestLogByListingId.has(entityId)) continue;
    latestLogByListingId.set(entityId, log);
  }

  const out = items.map((l) => {
    const u = userById.get(l.ownerId) || null;
    const log = latestLogByListingId.get(String(l.id || ""));
    const reviewType = log?.action === "LISTING_CHANGE_REAPPROVAL_SUBMIT" ? "CHANGE_APPROVAL" : "NEW_LISTING_REVIEW";
    const changedSections = normalizeChangedSections(log?.meta);

    return {
      id: l.id,
      title: titleFromListing(l),
      plan: planLabelFromListing(l),
      ownerId: l.ownerId,
      ownerEmail: u?.email || null,
      ownerName: u?.name || null,
      submittedForReviewAt: l.contentSubmittedAt ? new Date(l.contentSubmittedAt).toISOString() : null,
      paidAt: l.lastPaidAt ? new Date(l.lastPaidAt).toISOString() : null,
      previewToken: l.previewToken || null,
      location:
        [l.locationCity, l.locationState, l.locationCountry].filter(Boolean).join(", ") || null,
      heroImageUrl: l.heroImageUrl || null,
      imageUrls: Array.isArray(l.imageUrls) ? l.imageUrls : [],
      reviewType,
      changedSections,
    };
  });

  return NextResponse.json({ ok: true, items: out });
}
