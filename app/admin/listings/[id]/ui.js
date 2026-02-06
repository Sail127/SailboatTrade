"use client";

import { useMemo, useState } from "react";

export default function AdminListingActions({ id, status, paymentStatus, contentReviewStatus }) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");

  const s = String(status || "").toUpperCase();
  const pay = String(paymentStatus || "").toUpperCase();
  const crs = String(contentReviewStatus || "NONE").toUpperCase();

  const canApprovePublish = useMemo(() => {
    // only makes sense when not already published/removed
    if (s === "PUBLISHED" || s === "REMOVED") return false;
    // require payment for publish
    return pay === "PAID";
  }, [s, pay]);

  const showListingReviewActions = s !== "PUBLISHED"; // pending review flow, archived, rejected, etc.
  const showContentReviewActions = s === "PUBLISHED" && (crs === "PENDING" || crs === "REJECTED");

  async function act(action) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Action failed");
      location.reload();
    } catch (e) {
      alert(e?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="h-10 w-72 rounded-xl border px-3 text-sm"
      />

      {/* Listing-level workflow (new listing moderation) */}
      {showListingReviewActions && (
        <>
          <button
            disabled={busy || !canApprovePublish}
            onClick={() => act("APPROVE_PUBLISH")}
            className={`h-10 rounded-full px-4 text-sm font-semibold text-white ${
              canApprovePublish ? "bg-[#0a2230] hover:opacity-95" : "bg-slate-400 cursor-not-allowed"
            }`}
            title={!canApprovePublish ? "Requires PAID payment (and not already published/removed)." : ""}
          >
            Approve & Publish
          </button>

          <button
            disabled={busy}
            onClick={() => act("REJECT")}
            className="h-10 rounded-full border px-4 text-sm font-semibold"
          >
            Reject
          </button>
        </>
      )}

      {/* Content-change workflow (published listing edits) */}
      {showContentReviewActions && (
        <>
          <button
            disabled={busy || crs !== "PENDING"}
            onClick={() => act("APPROVE_CONTENT_CHANGES")}
            className={`h-10 rounded-full px-4 text-sm font-semibold text-white ${
              crs === "PENDING" ? "bg-[#0a2230] hover:opacity-95" : "bg-slate-400 cursor-not-allowed"
            }`}
            title={crs !== "PENDING" ? "No pending content changes to approve." : ""}
          >
            Approve Content Changes
          </button>

          <button
            disabled={busy || crs !== "PENDING"}
            onClick={() => act("REJECT_CONTENT_CHANGES")}
            className={`h-10 rounded-full border px-4 text-sm font-semibold ${
              crs === "PENDING" ? "" : "opacity-60 cursor-not-allowed"
            }`}
            title={crs !== "PENDING" ? "No pending content changes to reject." : ""}
          >
            Reject Content Changes
          </button>
        </>
      )}

      {/* Always-available admin safety actions */}
      <button
        disabled={busy}
        onClick={() => act("UNPUBLISH")}
        className="h-10 rounded-full border px-4 text-sm font-semibold"
      >
        Unpublish
      </button>

      <button
        disabled={busy}
        onClick={() => act("REMOVE")}
        className="h-10 rounded-full border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700"
      >
        Remove
      </button>

      <button
        disabled={busy}
        onClick={() => act("RESTORE")}
        className="h-10 rounded-full border px-4 text-sm font-semibold"
      >
        Restore
      </button>
    </div>
  );
}
