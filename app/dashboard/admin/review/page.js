// app/dashboard/admin/review/page.js
import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import AdminReviewClient from "./ui";

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

  const hasPhotoPlus =
    l?.photoPlan === "PHOTO_PLUS_25" || addons.includes("PHOTO_PLUS_25");

  const hasFeatured =
    !!l?.featuredHome || addons.includes("FEATURED_HOME");

  const parts = [];
  parts.push(hasPhotoPlus ? "Photo Plus (25)" : "Free (3)");

  if (hasFeatured) parts.push("Featured Home");

  // Optional billing hint in plan label (keeps your client UI simple)
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

export default async function AdminReviewPage() {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) redirect("/dashboard");

  // ✅ Reconciled query to match schema
  // NOTE: You control what gets set to PENDING_REVIEW.
  // If your submission flow is correct, this list is the queue.
  const items = await prisma.listing.findMany({
    where: {
      status: "PENDING_REVIEW",
      // Optional: if you only want listings that have actually been submitted:
      // contentSubmittedAt: { not: null },
    },
    orderBy: [
      { contentSubmittedAt: "asc" },
      { updatedAt: "asc" },
    ],
    take: 50,
    select: {
      id: true,
      ownerId: true,

      title: true,
      year: true,
      builder: true,
      model: true,

      // ✅ "plan" replacement fields
      photoPlan: true,
      featuredHome: true,
      billingStatus: true,
      billingAddons: true,

      previewToken: true,
      heroImageUrl: true,
      imageUrls: true,

      // ✅ replaces submittedForReviewAt / paidAt
      contentSubmittedAt: true,
      lastPaidAt: true,
    },
  });

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

  // ✅ Keep the same shape your AdminReviewClient already expects:
  // - plan (string)
  // - submittedForReviewAt (string iso) -> from contentSubmittedAt
  // - paidAt (string iso) -> from lastPaidAt
  const initialItems = items.map((l) => {
    const u = userById.get(l.ownerId) || null;
    const log = latestLogByListingId.get(String(l.id || ""));
    const reviewType = log?.action === "LISTING_CHANGE_REAPPROVAL_SUBMIT" ? "CHANGE_APPROVAL" : "NEW_LISTING_REVIEW";
    const changedSections = normalizeChangedSections(log?.meta);

    return {
      id: l.id,
      title: titleFromListing(l),

      plan: planLabelFromListing(l),

      ownerEmail: u?.email || null,
      ownerName: u?.name || null,

      previewToken: l.previewToken || null,
      heroImageUrl: l.heroImageUrl || null,
      imageUrls: Array.isArray(l.imageUrls) ? l.imageUrls : [],
      reviewType,
      changedSections,

      submittedForReviewAt: l.contentSubmittedAt ? new Date(l.contentSubmittedAt).toISOString() : null,
      paidAt: l.lastPaidAt ? new Date(l.lastPaidAt).toISOString() : null,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Admin tools header (keeps cleanup close to review workflow) */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-extrabold tracking-wide text-slate-500">ADMIN TOOLS</div>
            <div className="mt-1 text-[14px] font-semibold text-[#0a2230]">Review Queue</div>
            <div className="mt-1 text-[12px] text-slate-600">
              Storage cleanup is manual for now. Use it to delete old, unreferenced draft uploads.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/active-listings"
              className="inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold border border-slate-300 text-[#0a2230] hover:bg-slate-50"
            >
              Active Listings
            </Link>

            <Link
              href="/dashboard/admin/users"
              className="inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold border border-slate-300 text-[#0a2230] hover:bg-slate-50"
            >
              User Management
            </Link>

            <Link
              href="/dashboard/admin/email-health"
              className="inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold border border-slate-300 text-[#0a2230] hover:bg-slate-50"
            >
              Email Health
            </Link>

            <Link
              href="/dashboard/admin/email-previews"
              className="inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold border border-slate-300 text-[#0a2230] hover:bg-slate-50"
            >
              Email Previews
            </Link>

            <Link
              href="/dashboard/admin/storage"
              className="inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold border border-slate-300 text-[#0a2230] hover:bg-slate-50"
              title="Admin-only destructive tool"
            >
              Storage Cleanup
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold bg-[#0a2230] text-white hover:bg-[#0f2a3b]"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <AdminReviewClient initialItems={initialItems} />
    </div>
  );
}
