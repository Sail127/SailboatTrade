// app/dashboard/listings/RowActions.js
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function upper(v) {
  return String(v || "").toUpperCase();
}

function ActionIcon({ children }) {
  return <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">{children}</span>;
}

function EditIcon() {
  return (
    <ActionIcon>
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 13.5 5.7 12.8 12.7 5.8 10.2 3.3 3.2 10.3 2.5 13.5Z" />
        <path d="m9.4 4.1 2.5 2.5" />
      </svg>
    </ActionIcon>
  );
}

function UpgradeIcon() {
  return (
    <ActionIcon>
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2.2 9.7 5.6l3.8.6-2.7 2.6.6 3.7L8 10.8l-3.4 1.7.6-3.7L2.5 6.2l3.8-.6L8 2.2Z" />
      </svg>
    </ActionIcon>
  );
}

function RenewIcon() {
  return (
    <ActionIcon>
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 8A5 5 0 1 1 8 3" />
        <path d="M13 3.5v4h-4" />
      </svg>
    </ActionIcon>
  );
}

function SoldIcon() {
  return (
    <ActionIcon>
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 8 3 3 7-7" />
      </svg>
    </ActionIcon>
  );
}

export default function RowActions({
  id,
  status,
  previewToken,
  canEdit,
  showRenew,
  renewMode, // "FREE" | "PAID"
  canCancelAutoRenew = false,
  showUpgrade,
  showSoldButton = false,
  stackPrimaryActions = false,
  daysOnMarket = null,
  gridMode = false,
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
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [soldFormOpen, setSoldFormOpen] = useState(false);
  const [soldOnSailboatTrade, setSoldOnSailboatTrade] = useState("");
  const [soldFeedback, setSoldFeedback] = useState("");

  const s = upper(status);
  const isArchived = s === "ARCHIVED";
  const isRejected = s === "REJECTED";

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

    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(id)}/archive`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not archive.");
      setArchiveConfirmOpen(false);
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

  async function cancelAutoRenew() {
    if (busy) return;
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(id)}/cancel-auto-renew`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not cancel auto-renew.");
      router.refresh();
    } catch (e) {
      setMsg(e?.message || "Could not cancel auto-renew.");
    } finally {
      setBusy(false);
    }
  }

  async function reportSold() {
    if (busy) return;
    setMsg("");
    setArchiveConfirmOpen(false);

    if (soldOnSailboatTrade !== "yes" && soldOnSailboatTrade !== "no") {
      setMsg("Please tell us whether the boat sold on SailboatTrade.com.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(id)}/report-sold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soldOnSailboatTrade,
          feedback: soldFeedback,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not mark listing as sold.");
      setSoldFormOpen(false);
      setSoldOnSailboatTrade("");
      setSoldFeedback("");
      router.refresh();
    } catch (e) {
      setMsg(e?.message || "Could not mark listing as sold.");
    } finally {
      setBusy(false);
    }
  }

  const primaryButtons = showPrimaryActions ? (
    <div className={stackPrimaryActions ? "flex flex-col gap-2" : primaryClasses}>
      {showEdit ? (
        <Link
          href={editHref}
          className={
            isRejected
              ? `inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 ${stackPrimaryActions ? "w-full max-w-[210px] self-end" : ""}`
              : `inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50 ${stackPrimaryActions ? "w-full max-w-[210px] self-end" : ""}`
          }
        >
          <EditIcon />
          {isRejected ? "Edit & resubmit" : "Edit"}
        </Link>
      ) : null}

      {showUpgrade ? (
        <Link
          href={`/checkout/${encodeURIComponent(id)}`}
          className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold border border-[#f3b23f] bg-[#f3b23f] text-[#0a2230] hover:brightness-95 ${
            stackPrimaryActions ? "w-full max-w-[210px] self-end" : ""
          }`}
        >
          <UpgradeIcon />
          Upgrade
        </Link>
      ) : null}

      {showRenew ? (
        renewMode === "PAID" ? (
          <Link
            href={`/checkout/${encodeURIComponent(id)}`}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50 ${
              stackPrimaryActions ? "w-full max-w-[210px] self-end" : ""
            }`}
          >
            <RenewIcon />
            Renew
          </Link>
        ) : (
          <button
            type="button"
            onClick={renewFree}
            disabled={busy}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50 ${
              stackPrimaryActions ? "w-full max-w-[210px] self-end " : ""
            }${
              busy ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            <RenewIcon />
            {busy ? "Working." : "Renew"}
          </button>
        )
      ) : null}

      {canCancelAutoRenew ? (
        <button
          type="button"
          onClick={cancelAutoRenew}
          disabled={busy}
          className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 ${
            stackPrimaryActions ? "w-full max-w-[210px] self-end " : ""
          }${busy ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          <RenewIcon />
          {busy ? "Working." : "Stop auto-renew"}
        </button>
      ) : null}

      {showSoldButton && s === "PUBLISHED" ? (
        <button
          type="button"
          onClick={() => {
            setMsg("");
            setArchiveConfirmOpen(false);
            setSoldFormOpen((prev) => !prev);
          }}
          disabled={busy}
          className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 ${
            stackPrimaryActions ? "w-full max-w-[210px] self-end " : ""
          }${
            busy ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          <SoldIcon />
          Boat is SOLD!!
        </button>
      ) : null}
    </div>
  ) : null;

  const soldForm = soldFormOpen ? (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left">
      <div className="text-sm font-semibold text-emerald-900">
        Congratulations on selling! This listing sold after {Number.isFinite(daysOnMarket) ? daysOnMarket : 0} days on market.
      </div>
      <div className="mt-2 text-[13px] font-semibold text-[#0a2230]">
        Did this boat sell as a result of its advertisement on SailboatTrade.com?
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSoldOnSailboatTrade(option.value)}
            className={`inline-flex h-9 items-center justify-center rounded-full border px-4 text-[13px] font-semibold ${
              soldOnSailboatTrade === option.value
                ? "border-[#0a2230] bg-[#0a2230] text-white"
                : "border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="text-[12px] font-semibold text-[#0a2230]">
          Any constructive feedback for the site?
        </label>
        <textarea
          value={soldFeedback}
          onChange={(e) => setSoldFeedback(e.target.value)}
          rows={5}
          placeholder="Optional feedback helps us improve SailboatTrade.com."
          className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reportSold}
          disabled={busy}
          className={`inline-flex h-10 items-center justify-center rounded-xl bg-[#0a2230] px-4 text-sm font-semibold text-white hover:bg-[#0f2a3b] ${
            busy ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {busy ? "Sending..." : "Submit Sold Report"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSoldFormOpen(false);
            setMsg("");
          }}
          disabled={busy}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  const archiveConfirm = archiveConfirmOpen && !isArchived ? (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-left">
      <div className="text-sm font-semibold text-[#0a2230]">
        Did your boat sell? If it did please use the "Boat is SOLD" button.
      </div>
      <div className="mt-2 text-[13px] text-slate-700">
        Do you really want to archive this listing? It will no longer be public. Photos remain for 30 days, then only the hero image is kept.
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setArchiveConfirmOpen(false)}
          disabled={busy}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={archive}
          disabled={busy}
          className={`inline-flex h-10 items-center justify-center rounded-xl bg-[#0a2230] px-4 text-sm font-semibold text-white hover:bg-[#0f2a3b] ${
            busy ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {busy ? "Working..." : "Archive it"}
        </button>
      </div>
    </div>
  ) : null;

  const dangerAction = showDangerAction ? (
    !isArchived ? (
      <button
        type="button"
        onClick={() => {
          setMsg("");
          setSoldFormOpen(false);
          setArchiveConfirmOpen(true);
        }}
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
    )
  ) : null;

  const adminHint = showAdminHint && showAdminReviewHint ? (
    <div className="text-[11px] text-slate-600 sm:text-center">
      Editing is disabled during admin review.
    </div>
  ) : null;

  const messageBox = msg ? <div className={msgClasses}>{msg}</div> : null;

  if (gridMode) {
    return (
      <>
        <div className={["flex flex-col gap-2 lg:col-start-3 lg:row-start-1", containerClassName].filter(Boolean).join(" ")}>
          {primaryButtons}
          {dangerAction ? <div className="flex justify-end lg:justify-start">{dangerAction}</div> : null}
          {adminHint}
          {messageBox}
        </div>
        {archiveConfirm ? <div className="lg:col-span-3">{archiveConfirm}</div> : null}
        {soldForm ? <div className="lg:col-span-3">{soldForm}</div> : null}
      </>
    );
  }

  return (
    <div className={containerClasses}>
      {primaryButtons}
      {archiveConfirm}
      {soldForm}
      {showDangerAction ? <div className={dangerClasses}>{dangerAction}</div> : null}
      {adminHint}
      {messageBox}
    </div>
  );
}
