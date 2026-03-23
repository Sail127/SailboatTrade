import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import AdminActiveListingsClient from "./ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function displayTitle(listing) {
  const year = listing?.year != null ? String(listing.year) : "";
  const builder = String(listing?.builder || "").trim();
  const model = String(listing?.model || "").trim();
  const fallback = String(listing?.title || "Listing").trim();
  return [year, builder, model].filter(Boolean).join(" ") || fallback;
}

export default async function AdminActiveListingsPage({ searchParams }) {
  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) redirect("/dashboard");

  const listings = await prisma.listing.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      ownerId: true,
      status: true,
      title: true,
      year: true,
      builder: true,
      model: true,
      price: true,
      currency: true,
      heroImageUrl: true,
      imageUrls: true,
      featuredHome: true,
      billingStatus: true,
      billingAddons: true,
      photoPlan: true,
      createdAt: true,
      updatedAt: true,
      reviewedAt: true,
      expiresAt: true,
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
  });

  const initialListings = listings.map((listing) => ({
    id: listing.id,
    ownerId: listing.ownerId,
    status: listing.status,
    title: displayTitle(listing),
    price: listing.price,
    currency: listing.currency,
    heroImageUrl: listing.heroImageUrl,
    imageUrls: Array.isArray(listing.imageUrls) ? listing.imageUrls : [],
    featuredHome: Boolean(listing.featuredHome),
    billingStatus: listing.billingStatus,
    billingAddons: Array.isArray(listing.billingAddons) ? listing.billingAddons : [],
    photoPlan: listing.photoPlan,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    reviewedAt: listing.reviewedAt,
    expiresAt: listing.expiresAt,
    ownerEmail: listing.owner?.email || "",
    ownerName:
      `${String(listing.owner?.firstName || "").trim()} ${String(listing.owner?.lastName || "").trim()}`.trim() ||
      String(listing.owner?.name || "").trim() ||
      String(listing.owner?.businessName || "").trim() ||
      "Unknown owner",
    ownerBusinessName: listing.owner?.businessName || "",
  }));

  const initialFilters = {
    q: String(searchParams?.q || ""),
    status: String(searchParams?.status || "ALL").toUpperCase(),
    ownerId: String(searchParams?.ownerId || ""),
    sort: String(searchParams?.sort || "updated_desc"),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <div className="text-[12px] font-extrabold tracking-wide text-slate-500">ADMIN</div>
          <h1 className="mt-1 text-2xl font-semibold text-[#0a2230]">All Listings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Search, sort, and manage every listing on the site, including live and non-live statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin/review"
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
          >
            Review Queue
          </Link>
          <Link
            href="/dashboard/admin/storage"
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
          >
            Storage Cleanup
          </Link>
          <Link
            href="/dashboard/admin/users"
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
          >
            User Management
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#0a2230] px-5 text-[13px] font-semibold text-white hover:bg-[#0f2a3b]"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      <AdminActiveListingsClient initialListings={initialListings} initialFilters={initialFilters} />
    </div>
  );
}
