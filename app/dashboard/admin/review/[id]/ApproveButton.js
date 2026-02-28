"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApproveButton({ listingId, canApprove }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onApprove() {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch(`/api/admin/listings/${encodeURIComponent(String(listingId || ""))}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Approve failed.");
      setMsg("Listing approved and published.");
      router.refresh();
    } catch (e) {
      setErr(e?.message || "Approve failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    const reasonRaw = window.prompt("Send back comment (required):");
    if (reasonRaw == null) return;
    const reason = reasonRaw.trim();
    if (!reason) {
      setMsg("");
      setErr("A comment is required to send a listing back to draft.");
      return;
    }
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch(`/api/admin/listings/${encodeURIComponent(String(listingId || ""))}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Send back failed.");
      setMsg("Listing sent back to draft.");
      router.refresh();
    } catch (e) {
      setErr(e?.message || "Send back failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canApprove ? (
        <>
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-6 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Working..." : "Approve & publish"}
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-full bg-red-600 px-6 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Send back with comment
          </button>
        </>
      ) : (
        <div className="text-[13px] font-semibold text-slate-700">
          This listing is not currently pending review.
        </div>
      )}

      {msg ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
          {msg}
        </div>
      ) : null}
      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {err}
        </div>
      ) : null}
    </div>
  );
}
