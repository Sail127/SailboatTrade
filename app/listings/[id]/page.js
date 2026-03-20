// app/listings/[id]/page.js
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { readSession } from "@/lib/auth";
import ListingDetailClient from "./ListingDetailClient";
import { getCountryOptions } from "@/lib/countries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const US_REGION_LABELS = {
  WEST_COAST: "West Coast",
  EAST_COAST: "East Coast",
  GULF_COAST: "Gulf Coast",
  GREAT_LAKES: "Great Lakes",
  HAWAII: "Hawaii",
  OTHER_INLAND_WATERS: "Other Inland waters",
  OTHER_US_TERRITORIAL: "Other U.S. Territorial waters",
};

function countryLabelFromIso2(options, iso2) {
  const v = String(iso2 || "").toUpperCase().trim();
  const found = (options || []).find((o) => String(o?.value || "").toUpperCase().trim() === v);
  return found?.label || v || "";
}

function siteBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    "https://www.sailboattrade.com"
  ).replace(/\/+$/, "");
}

function listingTitle(listing) {
  const year = listing?.year != null ? String(listing.year) : "";
  const builder = String(listing?.builder || "").trim();
  const model = String(listing?.model || "").trim();
  const fallback = String(listing?.title || "Listing").trim();
  return [year, builder, model].filter(Boolean).join(" ") || fallback;
}

function summarize(text, max = 160) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "Sailboat listing on SailboatTrade.";
  return s.length > max ? `${s.slice(0, max - 1)}...` : s;
}

function absoluteImageUrl(raw) {
  const key = String(raw || "").trim();
  if (!key) return "";
  if (/^https?:\/\//i.test(key)) return key;

  const base = siteBaseUrl();
  if (key.startsWith("/")) return `${base}${key}`;

  const r2 = String(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (r2) return `${r2}/${encodeURIComponent(key)}`;

  return `${base}/api/uploads?key=${encodeURIComponent(key)}`;
}

export async function generateMetadata({ params }) {
  const id = String(params?.id || "").trim();
  if (!id) {
    return {
      title: "Listing | SailboatTrade",
      robots: { index: false, follow: false },
    };
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      title: true,
      description: true,
      year: true,
      builder: true,
      model: true,
      heroImageUrl: true,
      imageUrls: true,
    },
  });

  if (!listing) {
    return {
      title: "Listing | SailboatTrade",
      robots: { index: false, follow: false },
    };
  }

  const status = String(listing.status || "").toUpperCase();
  const canonical = `/listings/${encodeURIComponent(String(id))}`;
  const title = listingTitle(listing);
  const description = summarize(listing.description);
  const image =
    absoluteImageUrl(listing.heroImageUrl) ||
    absoluteImageUrl(Array.isArray(listing.imageUrls) ? listing.imageUrls[0] : "");

  const indexable = status === "PUBLISHED";

  return {
    title: `${title} | SailboatTrade`,
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
    openGraph: {
      type: "website",
      url: canonical,
      title: `${title} | SailboatTrade`,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${title} | SailboatTrade`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ListingDetailPage({ params, searchParams }) {
  const id = String(params?.id || "").trim();
  if (!id) return notFound();

  const token = String(searchParams?.token || "").trim();

  let listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return notFound();

  let status = String(listing.status || "").toUpperCase();
  const now = new Date();

  if (status === "PUBLISHED" && listing.expiresAt && new Date(listing.expiresAt) < now) {
    const updated = await prisma.listing.update({
      where: { id },
      data: { status: "ARCHIVED", featuredHome: false, archivedAt: now },
    });
    listing = updated;
    status = "ARCHIVED";
  }

  const session = await readSession();
  const uid = session?.uid || null;

  const ownerId = listing.ownerId || null;

  let viewerLoggedIn = false;
  if (uid) {
    const viewer = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, deletedAt: true, isDisabled: true },
    });
    viewerLoggedIn = Boolean(viewer && !viewer.deletedAt && !viewer.isDisabled);
  }

  const viewerIsOwner = viewerLoggedIn && !!ownerId && uid === ownerId;
  let viewerFavorited = false;
  if (viewerLoggedIn && uid) {
    const existingFavorite = await prisma.favorite.findUnique({
      where: { userId_listingId: { userId: uid, listingId: id } },
      select: { id: true },
    });
    viewerFavorited = Boolean(existingFavorite);
  }

  const isPublished = status === "PUBLISHED";
  const tokenOk = !!token && !!listing.previewToken && token === String(listing.previewToken);

  // View rules
  const tokenAllowed = tokenOk && !["ARCHIVED", "REMOVED"].includes(status);
  const canView = isPublished || viewerIsOwner || tokenAllowed;
  if (!canView) return notFound();

  // ✅ Edit allowed ONLY for owner AND only while DRAFT/REJECTED
  const canEdit = viewerIsOwner && ["DRAFT", "REJECTED"].includes(status);

  const countryOptions = getCountryOptions("en") || [];
  const locationCountryLabel = countryLabelFromIso2(countryOptions, listing.locationCountry);

  const usRegionLabel =
    String(listing.locationCountry || "").toUpperCase() === "US" && listing.locationUsRegion
      ? US_REGION_LABELS[listing.locationUsRegion] || listing.locationUsRegion
      : "";

  const listingSafe = JSON.parse(JSON.stringify(listing));

  return (
    <ListingDetailClient
      listing={listingSafe}
      viewerLoggedIn={viewerLoggedIn}
      viewerIsOwner={viewerIsOwner}
      viewerFavorited={viewerFavorited}
      canEdit={canEdit}
      locationCountryLabel={locationCountryLabel}
      usRegionLabel={usRegionLabel}
    />
  );
}
