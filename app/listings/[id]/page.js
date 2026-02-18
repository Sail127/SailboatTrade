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
  const found = (options || []).find(
    (o) => String(o?.value || "").toUpperCase().trim() === v
  );
  return found?.label || v || "";
}

export default async function ListingDetailPage({ params, searchParams }) {
  const id = params?.id;
  if (!id) return notFound();

  const token = String(searchParams?.token || "").trim();

  const listing = await prisma.listing.findUnique({
    where: { id },
  });
  if (!listing) return notFound();

  const status = String(listing.status || "").toUpperCase();

  const session = await readSession();
  const uid = session?.uid || null;

  // ✅ FIX: schema uses ownerId
  const ownerId = listing.ownerId || null;

  const viewerLoggedIn = !!uid;
  const viewerIsOwner = !!uid && !!ownerId && uid === ownerId;

  const isPublished = status === "PUBLISHED";
  const tokenOk = !!token && !!listing.previewToken && token === String(listing.previewToken);

  // ✅ View rules:
  // - PUBLISHED is public
  // - Non-published requires owner OR previewToken
  // - Token previews not allowed for ARCHIVED/REMOVED (owner can still see)
  const tokenAllowed = tokenOk && !["ARCHIVED", "REMOVED"].includes(status);
  const canView = isPublished || viewerIsOwner || tokenAllowed;
  if (!canView) return notFound();

  // ✅ Editing rules (matches your intended flow)
  const canEdit =
    viewerIsOwner && ["DRAFT", "READY_FOR_CHECKOUT", "REJECTED"].includes(status);

  const countryOptions = getCountryOptions("en") || [];
  const locationCountryLabel = countryLabelFromIso2(countryOptions, listing.locationCountry);

  const usRegionLabel =
    listing.locationCountry === "US" && listing.locationUsRegion
      ? US_REGION_LABELS[listing.locationUsRegion] || listing.locationUsRegion
      : "";

  const listingSafe = JSON.parse(JSON.stringify(listing));

  return (
    <ListingDetailClient
      listing={listingSafe}
      viewerLoggedIn={viewerLoggedIn}
      viewerIsOwner={viewerIsOwner}
      canEdit={canEdit}
      locationCountryLabel={locationCountryLabel}
      usRegionLabel={usRegionLabel}
    />
  );
}
