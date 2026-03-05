// app/dashboard/listings/RowActions.js
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function upper(v) {
  return String(v || "").toUpperCase();
}

export default function RowActions({
  id,
  status,
  previewToken,
  canEdit,
  showRenew,
  renewMode, // "FREE" | "PAID"
  showUpgrade,
  showPrimaryActions = true,
  showDangerAction = true,
  showAdminHint = true,
  containerClassName = "",
  primaryRowClassName = "",
  dangerRowClassName = "",
  messageClassName = "",
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const s = upper(status);
  const isArchived = s === "ARCHIVED";
  const isRejected = s === "REJECTED";

  const previewHref =
    s === "PUBLISHED"
      ? `/listings/${encodeURIComponent(id)}`
      : `/listings/${encodeURIComponent(id)}${
          previewToken ? `?token=${encodeURIComponent(previewToken)}` : ""
        }`;

  const editHref = `/dashboard/listings/${encodeURIComponent(id)}/edit`;

  const showEdit = Boolean(canEdit);
  const showAdminReviewHint = s === "PENDING_REVIEW";

  const containerClasses = [
    "flex flex-col items-stretch gap-2",
    showPrimaryActions ? "sm:min-w-[260px]" : "",
    containerClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const primaryClasses = ["flex flex-wrap gap-2 sm:justify-end", primaryRowClassName]
    .filter(Boolean)
    .join(" ");

  const dangerClasses = ["flex justify-center", dangerRowClassName].filter(Boolean).join(" ");

  const msgClasses = ["text-[11px] text-red-700 sm:text-center", messageClassName]
    .filter(Boolean)
    .join(" ");

  async function archive() {
    if (busy) return;
    setMsg("");

    const ok = window.confirm(
      "Archive this listing? It will no longer be public. Photos remain for 30 days, then only the hero image is kept."
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(id)}/archive`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not archive.");
      router.refresh();
    } catch (e) {
      setMsg(e?.message || "Could not archive.");
    } finally {
      setBusy(false);
    }
  }

  async function hardDelete() {
    if (busy) return;
    setMsg("");

    const ok = window.confirm("Permanently delete this listing? This cannot be undone.");
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(id)}/hard-delete`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not delete.");
      router.refresh();
    } catch (e) {
      setMsg(e?.message || "Could not delete.");
    } finally {
      setBusy(false);
    }
  }

  async function renewFree() {
    if (busy) return;
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(id)}/renew`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not renew.");
      router.refresh();
    } catch (e) {
      setMsg(e?.message || "Could not renew.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={containerClasses}>
      {showPrimaryActions ? (
        <div className={primaryClasses}>
          <Link
            href={previewHref}
            className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
          >
            Preview
          </Link>

          {showEdit ? (
            <Link
              href={editHref}
              className={
                isRejected
                  ? "inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
              }
            >
              {isRejected ? "Edit & resubmit" : "Edit"}
            </Link>
          ) : null}

          {showUpgrade ? (
            <Link
              href={`/checkout/${encodeURIComponent(id)}`}
              className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-semibold border border-[#f3b23f] bg-[#f3b23f] text-[#0a2230] hover:brightness-95"
            >
              Upgrade
            </Link>
          ) : null}

          {showRenew ? (
            renewMode === "PAID" ? (
              <Link
                href={`/checkout/${encodeURIComponent(id)}`}
                className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-semibold border border-[#f3b23f] bg-[#f3b23f] text-[#0a2230] hover:brightness-95"
              >
                Renew
              </Link>
            ) : (
              <button
                type="button"
                onClick={renewFree}
                disabled={busy}
                className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-semibold border border-[#f3b23f] bg-[#f3b23f] text-[#0a2230] hover:brightness-95 ${
                  busy ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {busy ? "Working." : "Renew"}
              </button>
            )
          ) : null}
        </div>
      ) : null}

      {showDangerAction ? (
        <div className={dangerClasses}>
          {!isArchived ? (
            <button
              type="button"
              onClick={archive}
              disabled={busy}
              className={`text-[12px] font-semibold text-red-600 underline underline-offset-2 hover:text-red-700 ${
                busy ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {busy ? "Working." : "Archive"}
            </button>
          ) : (
            <button
              type="button"
              onClick={hardDelete}
              disabled={busy}
              className={`text-[12px] font-semibold text-red-600 underline underline-offset-2 hover:text-red-700 ${
                busy ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {busy ? "Working." : "Delete listing"}
            </button>
          )}
        </div>
      ) : null}

      {showAdminHint && showAdminReviewHint ? (
        <div className="text-[11px] text-slate-600 sm:text-center">
          Editing is disabled during admin review.
        </div>
      ) : null}

      {msg ? <div className={msgClasses}>{msg}</div> : null}
    </div>
  );
}
