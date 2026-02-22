"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RowActions({ id, status, previewToken }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const s = String(status || "").toUpperCase();

  const isPublished = s === "PUBLISHED";
  const isArchived = s === "ARCHIVED";
  const isRemoved = s === "REMOVED";

  async function archive() {
    const label = isPublished ? "unpublish (archive)" : "archive";
    const ok = confirm(`Are you sure you want to ${label} this listing?`);
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${id}/archive`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed.");
      router.refresh();
    } catch (e) {
      alert(e?.message || "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    const ok = confirm("Restore this listing back to Draft?");
    if (!ok) return;

    setBusy(true);
    try {
      // ✅ keep your route name
      const res = await fetch(`/api/listings/${id}/restore`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed.");
      router.refresh();
    } catch (e) {
      alert(e?.message || "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function hardDelete() {
    // ✅ quick yes/no confirm (no typing)
    const ok = confirm(
      "Permanently delete this listing?\n\nThis cannot be undone."
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${id}/hard-delete`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Hard delete failed.");

      router.refresh();
      alert("Listing permanently deleted.");
    } catch (e) {
      alert(e?.message || "Hard delete failed.");
    } finally {
      setBusy(false);
    }
  }

  // ✅ your newer preview path format (matches /api/listings/create returning /listings/:id?token=...)
  const previewHref = `/listings/${id}?token=${encodeURIComponent(previewToken || "")}`;

  return (
    <div className="flex flex-wrap gap-2">
      {isPublished ? (
        <Link className="border rounded-md px-3 py-2 text-sm" href={`/listings/${id}`} target="_blank">
          View live
        </Link>
      ) : (
        <Link className="border rounded-md px-3 py-2 text-sm" href={previewHref} target="_blank">
          Preview
        </Link>
      )}

      <Link className="border rounded-md px-3 py-2 text-sm" href={`/dashboard/listings/${id}/edit`}>
        Edit
      </Link>

      {/* Archive / Unpublish */}
      {!isRemoved && !isArchived && (
        <button
          disabled={busy}
          className="border rounded-md px-3 py-2 text-sm border-red-200 bg-red-50 text-red-700"
          onClick={archive}
        >
          {busy ? "Working…" : isPublished ? "Unpublish" : "Archive"}
        </button>
      )}

      {/* Restore */}
      {!isRemoved && isArchived && (
        <button disabled={busy} className="border rounded-md px-3 py-2 text-sm" onClick={restore}>
          {busy ? "Working…" : "Restore"}
        </button>
      )}

      {/* Hard delete ONLY for archived */}
      {!isRemoved && isArchived && (
        <button
          disabled={busy}
          className="border rounded-md px-3 py-2 text-sm border-red-300 bg-red-100 text-red-800"
          onClick={hardDelete}
          title="Permanently delete listing and images"
        >
          {busy ? "Working…" : "Delete permanently"}
        </button>
      )}
    </div>
  );
}