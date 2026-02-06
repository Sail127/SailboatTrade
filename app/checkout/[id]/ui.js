"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutUI({ listing }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const isPaid = listing?.paymentStatus === "PAID";
  const status = String(listing?.status || "").toUpperCase();
  const previewUrl = listing?.previewToken ? `/listings/preview/${listing.previewToken}` : "";

  async function simulatePay() {
    setErr("");
    setBusy(true);

    try {
      const res = await fetch(`/api/listings/${listing.id}/mark-paid`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Payment failed.");
      }

      // mark-paid now sets: paymentStatus=PAID and status=PENDING_REVIEW
      // Send user to preview (safe even when not published).
      router.push(`/listings/preview/${data.previewToken}`);
    } catch (e) {
      setErr(e?.message || "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#0a2230]">Checkout</h1>
            <p className="mt-2 text-sm text-slate-600">
              {isPaid ? (
                <>
                  Payment received. Your listing is now{" "}
                  <span className="font-semibold">submitted for admin approval</span> and will go live after review.
                </>
              ) : (
                <>
                  Complete payment to submit your listing for admin approval. It won’t be public until it’s approved and
                  published.
                </>
              )}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-500">Status</div>
            <div className="text-sm font-semibold text-[#0a2230]">
              {status || "-"} · {listing?.paymentStatus || "-"}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-slate-50 p-4">
          <div className="text-sm font-semibold text-[#0a2230]">
            {listing?.title ||
              `${listing?.year || ""} ${listing?.builder || ""} ${listing?.model || ""}`.trim() ||
              "Listing"}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {listing?.price != null ? (
              <>
                Price:{" "}
                <span className="font-semibold text-[#0a2230]">
                  {listing?.currency || "USD"} {Number(listing.price).toLocaleString()}
                </span>
              </>
            ) : (
              <>Price: <span className="font-semibold text-slate-700">Not set</span></>
            )}
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {!isPaid ? (
            <button
              onClick={simulatePay}
              disabled={busy}
              className="h-10 rounded-full bg-[#c8a44d] px-5 text-sm font-semibold text-[#0a2230] hover:brightness-95 disabled:opacity-60"
            >
              {busy ? "Processing…" : "Simulate payment success"}
            </button>
          ) : (
            <a
              href={previewUrl || "#"}
              onClick={(e) => {
                if (!previewUrl) e.preventDefault();
              }}
              className={`h-10 inline-flex items-center rounded-full px-5 text-sm font-semibold ${
                previewUrl
                  ? "bg-[#0a2230] text-white hover:opacity-95"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
              }`}
            >
              View preview
            </a>
          )}

          <Link
            href={`/dashboard/listings/${listing.id}/edit`}
            className="h-10 inline-flex items-center rounded-full border px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50"
          >
            Edit listing
          </Link>

          <Link
            href="/dashboard/listings"
            className="h-10 inline-flex items-center rounded-full border px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Note: This is a stub checkout UI. When you wire Stripe, keep the same state transitions:
          <span className="font-semibold"> PAID → PENDING_REVIEW → (admin) PUBLISHED</span>.
        </div>
      </div>
    </div>
  );
}
