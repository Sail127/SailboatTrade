import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { getCountryOptions } from "@/lib/countries";
import ApproveButton from "./ApproveButton";
import ListingDetailClient from "@/app/listings/[id]/ListingDetailClient";

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

function titleFromListing(l) {
  const year = l?.year != null ? String(l.year) : "";
  const builder = String(l?.builder || "").trim();
  const model = String(l?.model || "").trim();
  const fallback = String(l?.title || "Listing").trim();
  return [year, builder, model].filter(Boolean).join(" ") || fallback;
}

function countryLabelFromIso2(options, iso2) {
  const v = String(iso2 || "").toUpperCase().trim();
  const found = (options || []).find(
    (o) => String(o?.value || "").toUpperCase().trim() === v
  );
  return found?.label || v || "";
}

function normalizeChangedSections(meta) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  const raw = meta.changedSections;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x || "").trim()).filter(Boolean);
}

export default async function AdminReviewPreviewPage({ params }) {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) redirect("/dashboard");

  const id = String(params?.id || "").trim();
  if (!id) return notFound();

  const listing = await prisma.listing.findUnique({
    where: { id },
  });
  if (!listing) return notFound();
  const latestSubmission = await prisma.adminAuditLog.findFirst({
    where: {
      entityType: "Listing",
      entityId: id,
      action: { in: ["LISTING_CHANGE_REAPPROVAL_SUBMIT", "LISTING_NEW_REVIEW_SUBMIT"] },
    },
    orderBy: { createdAt: "desc" },
    select: { action: true, meta: true },
  });
  const reviewType =
    latestSubmission?.action === "LISTING_CHANGE_REAPPROVAL_SUBMIT"
      ? "CHANGE_APPROVAL"
      : "NEW_LISTING_REVIEW";
  const changedSections = normalizeChangedSections(latestSubmission?.meta);

  const status = String(listing.status || "").toUpperCase();
  const canApprove = status === "PENDING_REVIEW";
  const countryOptions = getCountryOptions("en") || [];
  const locationCountryLabel = countryLabelFromIso2(
    countryOptions,
    listing.locationCountry
  );
  const usRegionLabel =
    String(listing.locationCountry || "").toUpperCase() === "US" &&
    listing.locationUsRegion
      ? US_REGION_LABELS[listing.locationUsRegion] || listing.locationUsRegion
      : "";
  const listingSafe = JSON.parse(JSON.stringify(listing));

  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_12px_28px_rgba(2,6,23,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[12px] font-extrabold tracking-wide text-slate-500">
                ADMIN LISTING REVIEW
              </div>
              <h1 className="mt-1 text-[20px] sm:text-[22px] font-extrabold text-[#0a2230]">
                {titleFromListing(listing)}
              </h1>
              <div className="mt-1 text-[13px] text-slate-600">
                Status:{" "}
                <span className="font-semibold text-[#0a2230]">{status}</span>
              </div>
              <div className="mt-1 text-[13px] text-slate-600">
                Review type:{" "}
                <span className="font-semibold text-[#0a2230]">
                  {reviewType === "CHANGE_APPROVAL" ? "Change approval" : "New listing review"}
                </span>
              </div>
              {reviewType === "CHANGE_APPROVAL" && changedSections.length ? (
                <div className="mt-1 text-[13px] text-slate-600">
                  Changed sections:{" "}
                  <span className="font-semibold text-[#0a2230]">{changedSections.join(", ")}</span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/admin/review"
                className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
              >
                Back to Queue
              </Link>
            </div>
          </div>

          <div className="mt-4">
            <ApproveButton listingId={id} canApprove={canApprove} />
          </div>
        </div>
      </div>

      <ListingDetailClient
        listing={listingSafe}
        viewerLoggedIn={true}
        viewerIsOwner={true}
        viewerFavorited={false}
        canEdit={false}
        locationCountryLabel={locationCountryLabel}
        usRegionLabel={usRegionLabel}
        forcedPreviewToken={String(listing.previewToken || "")}
      />
    </div>
  );
}
