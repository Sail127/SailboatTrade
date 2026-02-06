// app/admin/listings/[id]/page.js
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import ListingDetail from "@/components/ListingDetail";
import AdminListingActions from "./ui";

export const dynamic = "force-dynamic";

function firstN(arr, n) {
  return Array.isArray(arr) ? arr.slice(0, n) : [];
}

function uploadSrc(key, token) {
  if (!key || !token) return "";
  return `/api/uploads?key=${encodeURIComponent(String(key))}&token=${encodeURIComponent(String(token))}`;
}

function changed(a, b) {
  const A = a ?? null;
  const B = b ?? null;
  return String(A) !== String(B);
}

export default async function AdminListingDetail({ params }) {
  const gate = await requireAdminApi("MODERATOR");
  if (!gate.ok) throw new Error(gate.error);

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { owner: { select: { email: true } } },
  });

  if (!listing) throw new Error("Not found");

  const status = String(listing.status || "").toUpperCase();
  const crs = String(listing.contentReviewStatus || "NONE").toUpperCase();
  const token = listing.previewToken;

  const hasPendingContent = status === "PUBLISHED" && (crs === "PENDING" || crs === "REJECTED");

  const liveTitle = listing.title || "";
  const liveDesc = listing.description || "";
  const liveHero = listing.heroImageUrl || "";
  const liveImgs = listing.imageUrls || [];

  const pendingTitle = listing.pendingTitle ?? listing.title ?? "";
  const pendingDesc = listing.pendingDescription ?? listing.description ?? "";
  const pendingHero = listing.pendingHeroImageUrl ?? listing.heroImageUrl ?? "";
  const pendingImgs = (Array.isArray(listing.pendingImageUrls) && listing.pendingImageUrls.length > 0)
    ? listing.pendingImageUrls
    : (listing.imageUrls || []);

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">Owner: {listing.owner?.email || "-"}</div>
            <div className="text-sm font-semibold text-[#0a2230]">
              Status: {listing.status} · Payment: {listing.paymentStatus}
              {status === "PUBLISHED" && (
                <>
                  {" "}· Content review:{" "}
                  <span className={crs === "PENDING" ? "text-amber-700" : crs === "REJECTED" ? "text-red-700" : "text-slate-700"}>
                    {listing.contentReviewStatus || "NONE"}
                  </span>
                </>
              )}
            </div>
          </div>

          <AdminListingActions
            id={listing.id}
            status={listing.status}
            paymentStatus={listing.paymentStatus}
            contentReviewStatus={listing.contentReviewStatus || "NONE"}
          />
        </div>
      </div>

      {/* Live vs Pending content changes */}
      {hasPendingContent && (
        <div className="mx-auto max-w-7xl px-5 pb-6">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-[#0a2230]">Pending content changes</div>
              <div className="text-xs text-slate-500">
                Submitted: {listing.contentSubmittedAt ? new Date(listing.contentSubmittedAt).toLocaleString() : "—"}
              </div>
            </div>

            {crs === "REJECTED" && listing.contentRejectionReason && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div className="font-semibold">Previous rejection reason</div>
                <div className="mt-1">{listing.contentRejectionReason}</div>
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {/* LIVE */}
              <div className="rounded-xl border bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-600">LIVE</div>

                <div className="mt-2 text-sm">
                  <span className="font-semibold">Title:</span>{" "}
                  <span className={changed(liveTitle, pendingTitle) ? "underline decoration-amber-400" : ""}>
                    {liveTitle || "—"}
                  </span>
                </div>

                <div className="mt-2 text-sm">
                  <span className="font-semibold">Description:</span>{" "}
                  <span className={changed(liveDesc, pendingDesc) ? "underline decoration-amber-400" : ""}>
                    {(liveDesc || "—").slice(0, 240)}{(liveDesc || "").length > 240 ? "…" : ""}
                  </span>
                </div>

                <div className="mt-2 text-sm">
                  <span className="font-semibold">Images:</span> {Array.isArray(liveImgs) ? liveImgs.length : 0}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {firstN([liveHero, ...liveImgs].filter(Boolean), 4).map((k) => (
                    <img
                      key={`live-${k}`}
                      src={uploadSrc(k, token)}
                      alt=""
                      className="h-16 w-20 rounded-lg border object-cover"
                    />
                  ))}
                  {!token && (
                    <div className="text-xs text-slate-500">No preview token available for thumbnails.</div>
                  )}
                </div>
              </div>

              {/* PENDING */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs font-semibold text-amber-800">PENDING</div>

                <div className="mt-2 text-sm">
                  <span className="font-semibold">Title:</span>{" "}
                  <span className={changed(liveTitle, pendingTitle) ? "underline decoration-amber-600" : ""}>
                    {pendingTitle || "—"}
                  </span>
                </div>

                <div className="mt-2 text-sm">
                  <span className="font-semibold">Description:</span>{" "}
                  <span className={changed(liveDesc, pendingDesc) ? "underline decoration-amber-600" : ""}>
                    {(pendingDesc || "—").slice(0, 240)}{(pendingDesc || "").length > 240 ? "…" : ""}
                  </span>
                </div>

                <div className="mt-2 text-sm">
                  <span className="font-semibold">Images:</span> {Array.isArray(pendingImgs) ? pendingImgs.length : 0}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {firstN([pendingHero, ...pendingImgs].filter(Boolean), 4).map((k) => (
                    <img
                      key={`pending-${k}`}
                      src={uploadSrc(k, token)}
                      alt=""
                      className="h-16 w-20 rounded-lg border object-cover"
                    />
                  ))}
                </div>

                <div className="mt-3 text-xs text-slate-700">
                  Approving applies the pending title/description/photos to the live listing.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* preview token lets admin view images in non-public states */}
      <ListingDetail listing={{ ...listing, __previewToken: listing.previewToken }} />
    </div>
  );
}
