import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import ApproveButton from "./ApproveButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function titleFromListing(l) {
  const year = l?.year != null ? String(l.year) : "";
  const builder = String(l?.builder || "").trim();
  const model = String(l?.model || "").trim();
  const fallback = String(l?.title || "Listing").trim();
  return [year, builder, model].filter(Boolean).join(" ") || fallback;
}

export default async function AdminReviewPreviewPage({ params }) {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) redirect("/dashboard");

  const id = String(params?.id || "").trim();
  if (!id) return notFound();

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      year: true,
      builder: true,
      model: true,
      status: true,
      previewToken: true,
    },
  });
  if (!listing) return notFound();

  const status = String(listing.status || "").toUpperCase();
  const canApprove = status === "PENDING_REVIEW";
  const previewHref = listing.previewToken
    ? `/listings/${encodeURIComponent(id)}?token=${encodeURIComponent(String(listing.previewToken))}`
    : `/listings/${encodeURIComponent(id)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(2,6,23,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[12px] font-extrabold tracking-wide text-slate-500">
              ADMIN LISTING REVIEW
            </div>
            <h1 className="mt-1 text-[22px] font-extrabold text-[#0a2230]">
              {titleFromListing(listing)}
            </h1>
            <div className="mt-1 text-[13px] text-slate-600">
              Status: <span className="font-semibold text-[#0a2230]">{status}</span>
            </div>
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

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_rgba(2,6,23,0.08)]">
        <iframe
          src={previewHref}
          title={`Listing preview ${id}`}
          className="h-[78vh] w-full"
        />
      </div>
    </div>
  );
}
