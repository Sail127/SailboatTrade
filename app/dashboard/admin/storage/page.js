// app/dashboard/admin/storage/page.js
import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { getStorageReport } from "@/lib/storageReport";
import DraftCleanupPanel from "./DraftCleanupPanel";

export const dynamic = "force-dynamic";

export default async function AdminStoragePage() {
  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) redirect("/dashboard");

  const [inactiveListings, storageReport] = await Promise.all([
    prisma.listing.findMany({
      where: {
        status: {
          not: "PUBLISHED",
        },
      },
      orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        ownerId: true,
        status: true,
        title: true,
        year: true,
        builder: true,
        model: true,
        heroImageUrl: true,
        imageUrls: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            businessName: true,
          },
        },
      },
    }),
    getStorageReport(),
  ]);

  const initialDraftListings = inactiveListings.map((listing) => ({
    id: listing.id,
    ownerId: listing.ownerId,
    status: listing.status,
    title:
      [listing?.year != null ? String(listing.year) : "", String(listing.builder || "").trim(), String(listing.model || "").trim()]
        .filter(Boolean)
        .join(" ") || String(listing.title || "Untitled listing").trim(),
    heroImageUrl: listing.heroImageUrl || null,
    imageUrls: Array.isArray(listing.imageUrls) ? listing.imageUrls : [],
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    ownerEmail: listing.owner?.email || "",
    ownerName:
      `${String(listing.owner?.firstName || "").trim()} ${String(listing.owner?.lastName || "").trim()}`.trim() ||
      String(listing.owner?.name || "").trim() ||
      String(listing.owner?.businessName || "").trim() ||
      "Unknown owner",
    ownerBusinessName: listing.owner?.businessName || "",
    imageCount: Array.isArray(listing.imageUrls) ? listing.imageUrls.length : 0,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-extrabold tracking-wide text-slate-500">ADMIN</div>
            <h1 className="mt-1 text-2xl font-semibold text-[#0a2230]">Storage Cleanup / Site Inactive Listings</h1>
            <p className="mt-1 text-sm text-slate-600">
              Remove unreferenced draft uploads and review any non-live listings that are no longer needed.
            </p>
          </div>

          <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin/active-listings"
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
          >
            Active Listings
          </Link>
          <Link
            href="/dashboard/admin/users"
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
          >
            User Management
          </Link>
          <Link
            href="/dashboard/admin/email-health"
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
          >
            Email Health
          </Link>
          <Link
            href="/dashboard/admin/email-previews"
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
          >
            Email Previews
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#0a2230] px-5 text-[13px] font-semibold text-white hover:bg-[#0f2a3b]"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <DraftCleanupPanel initialDraftListings={initialDraftListings} storageReport={storageReport} />
    </div>
  );
}
