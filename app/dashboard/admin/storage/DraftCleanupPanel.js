"use client";

// app/dashboard/admin/storage/DraftCleanupPanel.js
import { useMemo, useState } from "react";

const GOLD = "#c8a44d";

const card =
  "rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(2,6,23,0.08)] overflow-hidden";

const btnPrimary =
  "inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold " +
  "bg-[#0a2230] text-white hover:bg-[#0f2a3b] transition disabled:opacity-60 disabled:cursor-not-allowed";

const btnDanger =
  "inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold " +
  "bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed";

const input =
  "h-10 w-28 rounded-xl border border-slate-300 px-3 text-[13px] text-[#0a2230] outline-none focus:ring-2 focus:ring-[#c8a44d]/40";

function fmtDate(value) {
  try {
    return value ? new Date(value).toLocaleString() : "";
  } catch {
    return "";
  }
}

function daysSince(value) {
  try {
    const ts = new Date(value).getTime();
    if (!Number.isFinite(ts)) return null;
    return Math.max(0, Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000)));
  } catch {
    return null;
  }
}

function imageUrlFromKey(key) {
  const value = String(key || "").trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return value;
  const normalized = value.replace(/^public\//, "");
  if (normalized.startsWith("boats/") || normalized.startsWith("images/")) return `/${normalized}`;
  return `/api/uploads?key=${encodeURIComponent(value)}`;
}

function listingThumbSrc(listing) {
  const candidates = [listing?.heroImageUrl];
  if (Array.isArray(listing?.imageUrls) && listing.imageUrls.length > 0) {
    candidates.push(listing.imageUrls[0]);
  }
  const src = candidates.find(Boolean);
  return src ? imageUrlFromKey(src) : null;
}

function statusLabel(status) {
  const value = String(status || "").toUpperCase();
  if (value === "DRAFT") return "Draft";
  if (value === "PENDING_REVIEW") return "Pending Review";
  if (value === "REJECTED") return "Changes Requested";
  if (value === "ARCHIVED") return "Archived";
  if (value === "REMOVED") return "Removed";
  return value || "Unknown";
}

function statusTone(status) {
  const value = String(status || "").toUpperCase();
  if (value === "DRAFT") return "border-slate-300 bg-slate-50 text-slate-700";
  if (value === "PENDING_REVIEW") return "border-amber-300 bg-amber-50 text-amber-900";
  if (value === "REJECTED") return "border-red-300 bg-red-50 text-red-700";
  if (value === "ARCHIVED") return "border-sky-300 bg-sky-50 text-sky-900";
  if (value === "REMOVED") return "border-zinc-300 bg-zinc-100 text-zinc-700";
  return "border-slate-300 bg-slate-50 text-slate-700";
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 || unit === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`;
}

export default function DraftCleanupPanel({ initialDraftListings = [], storageReport = null }) {
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [inactiveCleanupBusy, setInactiveCleanupBusy] = useState(false);
  const [emailCleanupBusy, setEmailCleanupBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [inactiveCleanupResult, setInactiveCleanupResult] = useState(null);
  const [emailCleanupResult, setEmailCleanupResult] = useState(null);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [draftListings, setDraftListings] = useState(Array.isArray(initialDraftListings) ? initialDraftListings : []);
  const [draftQuery, setDraftQuery] = useState("");
  const [draftBusyId, setDraftBusyId] = useState("");
  const [inactiveDaysFilter, setInactiveDaysFilter] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const daysSafe = useMemo(() => {
    const n = Number(days);
    if (!Number.isFinite(n)) return 7;
    return Math.min(90, Math.max(1, Math.floor(n)));
  }, [days]);

  const filteredDrafts = useMemo(() => {
    const search = draftQuery.trim().toLowerCase();
    return draftListings.filter((listing) => {
      const listingStatus = String(listing.status || "").toUpperCase();
      if (statusFilter !== "ALL" && listingStatus !== statusFilter) {
        return false;
      }
      const inactiveDays = daysSince(listing.updatedAt);
      if (inactiveDaysFilter > 0 && (inactiveDays == null || inactiveDays < inactiveDaysFilter)) {
        return false;
      }
      if (!search) return true;
      return (
        String(listing.id || "").toLowerCase().includes(search) ||
        String(listing.title || "").toLowerCase().includes(search) ||
        String(listing.ownerEmail || "").toLowerCase().includes(search) ||
        String(listing.ownerName || "").toLowerCase().includes(search) ||
        String(listing.ownerBusinessName || "").toLowerCase().includes(search)
      );
    });
  }, [draftListings, draftQuery, inactiveDaysFilter, statusFilter]);

  function clearMessages() {
    setErr("");
    setSuccess("");
  }

  async function run(dryRun) {
    clearMessages();
    setResult(null);
    setBusy(true);

    try {
      const res = await fetch("/api/admin/cleanup-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: daysSafe, dryRun }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      setResult(data);

      // ✅ Success banner only for destructive delete run
      if (!dryRun && data?.mode === "delete") {
        const attempted = data?.deletions?.attempted ?? 0;
        const deleted = data?.deletions?.deleted ?? 0;
        const candidates = data?.candidatesFound ?? 0;

        setSuccess(
          `Cleanup complete — deleted ${deleted}/${attempted} objects (candidates: ${candidates}).`
        );
      }
    } catch (e) {
      setErr(e?.message || "Cleanup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraftListing(listing) {
    if (!listing?.id) return;

    const statusText = statusLabel(listing.status).toLowerCase();

    const confirmed = window.confirm(
      `Delete ${statusText} listing "${listing.title || "this listing"}"? \n\nThis permanently removes the listing and its stored listing images. This cannot be undone.`
    );
    if (!confirmed) return;

    clearMessages();
    setDraftBusyId(listing.id);
    try {
      const res = await fetch(`/api/admin/listings/${encodeURIComponent(listing.id)}/delete`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not delete listing.");
      }

      setDraftListings((prev) => prev.filter((item) => item.id !== listing.id));
      setSuccess(`"${data?.deletedTitle || listing.title || listing.id}" was deleted.`);
    } catch (e) {
      setErr(e?.message || "Could not delete listing.");
    } finally {
      setDraftBusyId("");
    }
  }

  async function runInactiveListingCleanup() {
    return runInactiveListingCleanupWithMode("older_than_30_days");
  }

  async function runInactiveListingCleanupWithMode(mode) {
    clearMessages();
    setInactiveCleanupResult(null);
    setInactiveCleanupBusy(true);
    try {
      const res = await fetch("/api/admin/cleanup-inactive-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Could not run inactive listing cleanup.");
      }
      setInactiveCleanupResult(data);
      const label = data?.mode === "all" ? "all non-live listings" : "inactive listings older than 30 days";
      setSuccess(`Inactive listing cleanup complete. Deleted ${data?.deletedListings || 0} ${label}.`);
      if (data?.deletedListings > 0) {
        window.location.reload();
      }
    } catch (e) {
      setErr(e?.message || "Could not run inactive listing cleanup.");
    } finally {
      setInactiveCleanupBusy(false);
    }
  }

  async function runEmailEventCleanup() {
    clearMessages();
    setEmailCleanupResult(null);
    setEmailCleanupBusy(true);
    try {
      const res = await fetch("/api/admin/cleanup-email-events", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Could not run email event cleanup.");
      }
      setEmailCleanupResult(data);
      setSuccess(`Email event cleanup complete. Deleted ${data?.deletedEvents || 0} old events.`);
    } catch (e) {
      setErr(e?.message || "Could not run email event cleanup.");
    } finally {
      setEmailCleanupBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className={card}>
        <div className="px-5 py-3 bg-[#0a2230] border-b border-black/10">
          <div className="text-[15px] font-extrabold tracking-wide" style={{ color: GOLD }}>
            Manual Cleanup Routines
          </div>
          <div className="mt-1 text-[12px] text-white/80">
            Run the new retention cleanups manually from admin controls until you’re ready to automate them.
          </div>
        </div>

        <div className="p-5 space-y-4">
          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
              {success}
            </div>
          ) : null}

          {err ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {err}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[13px] font-extrabold text-[#0a2230]">Inactive Listing Retention Cleanup</div>
              <div className="mt-1 text-[12px] text-slate-600">
                Run either a full non-live listing cleanup or a safer pass that only removes non-live listings older than 30 days.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm("Run cleanup for all non-live listings now? This will delete every non-live listing on the site.");
                    if (ok) runInactiveListingCleanupWithMode("all");
                  }}
                  disabled={inactiveCleanupBusy}
                  className={btnDanger}
                >
                  {inactiveCleanupBusy ? "Working…" : "Clean Up All"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm("Run cleanup for non-live listings older than 30 days?");
                    if (ok) runInactiveListingCleanupWithMode("older_than_30_days");
                  }}
                  disabled={inactiveCleanupBusy}
                  className={btnPrimary}
                >
                  {inactiveCleanupBusy ? "Working…" : "Clean Up Older Than 30 Days"}
                </button>
              </div>
              {inactiveCleanupResult ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700">
                  Deleted <span className="font-semibold">{inactiveCleanupResult.deletedListings || 0}</span> listings from{" "}
                  <span className="font-semibold">{inactiveCleanupResult.scannedCandidates || 0}</span> candidates.
                  {inactiveCleanupResult?.mode === "all" ? " Mode: all non-live listings." : " Mode: older than 30 days."}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[13px] font-extrabold text-[#0a2230]">Email Event Retention Cleanup</div>
              <div className="mt-1 text-[12px] text-slate-600">
                Deletes old persisted email delivery events so operational history does not grow forever in the database.
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm("Run email event retention cleanup now?");
                    if (ok) runEmailEventCleanup();
                  }}
                  disabled={emailCleanupBusy}
                  className={btnPrimary}
                >
                  {emailCleanupBusy ? "Working…" : "Run Email Event Cleanup"}
                </button>
              </div>
              {emailCleanupResult ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700">
                  Deleted <span className="font-semibold">{emailCleanupResult.deletedEvents || 0}</span> events older than{" "}
                  <span className="font-semibold">{emailCleanupResult.retentionDays || 0}</span> days.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {storageReport ? (
        <div className={card}>
          <div className="px-5 py-3 bg-[#0a2230] border-b border-black/10">
            <div className="text-[15px] font-extrabold tracking-wide" style={{ color: GOLD }}>
              Storage Report
            </div>
            <div className="mt-1 text-[12px] text-white/80">
              Snapshot of referenced assets, orphaned bytes, and the biggest users and listings by storage footprint.
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-extrabold tracking-[0.14em] text-slate-500">BUCKET TOTAL</div>
                <div className="mt-2 text-xl font-extrabold text-[#0a2230]">{formatBytes(storageReport?.totals?.bytes)}</div>
                <div className="mt-1 text-[12px] text-slate-600">{storageReport?.totals?.objects || 0} objects</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-extrabold tracking-[0.14em] text-slate-500">REFERENCED</div>
                <div className="mt-2 text-xl font-extrabold text-[#0a2230]">{storageReport?.totals?.referencedObjects || 0}</div>
                <div className="mt-1 text-[12px] text-slate-600">objects tied to users or listings</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-[11px] font-extrabold tracking-[0.14em] text-amber-700">ORPHANED</div>
                <div className="mt-2 text-xl font-extrabold text-amber-900">{formatBytes(storageReport?.totals?.orphanedBytes)}</div>
                <div className="mt-1 text-[12px] text-amber-800">{storageReport?.totals?.orphanedObjects || 0} objects not referenced</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-extrabold tracking-[0.14em] text-slate-500">SNAPSHOT</div>
                <div className="mt-2 text-sm font-extrabold text-[#0a2230]">{fmtDate(storageReport?.generatedAt)}</div>
                <div className="mt-1 text-[12px] text-slate-600">Use this before running cleanup actions</div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[12px] font-extrabold tracking-[0.14em] text-slate-500">BY STATUS</div>
                <div className="mt-3 space-y-2">
                  {(storageReport?.byStatus || []).map((row) => (
                    <div key={row.status} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[13px]">
                      <div>
                        <div className="font-semibold text-[#0a2230]">{statusLabel(row.status)}</div>
                        <div className="text-slate-500">{row.listingCount} listings • {row.assetCount} assets</div>
                      </div>
                      <div className="font-extrabold text-slate-700">{formatBytes(row.bytes)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[12px] font-extrabold tracking-[0.14em] text-slate-500">TOP OWNERS</div>
                <div className="mt-3 space-y-2">
                  {(storageReport?.topOwners || []).map((row) => (
                    <div key={row.ownerId} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[13px]">
                      <div className="font-semibold text-[#0a2230]">{row.ownerName}</div>
                      <div className="break-all text-slate-500">{row.ownerEmail}</div>
                      <div className="mt-1 font-extrabold text-slate-700">{formatBytes(row.bytes)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[12px] font-extrabold tracking-[0.14em] text-slate-500">TOP LISTINGS</div>
                <div className="mt-3 space-y-2">
                  {(storageReport?.topListings || []).map((row) => (
                    <div key={row.listingId} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[13px]">
                      <div className="font-semibold text-[#0a2230]">{row.title}</div>
                      <div className="text-slate-500">{statusLabel(row.status)} • {row.ownerName}</div>
                      <div className="mt-1 font-extrabold text-slate-700">{formatBytes(row.bytes)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className={card}>
        <div className="px-5 py-3 bg-[#0a2230] border-b border-black/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[15px] font-extrabold tracking-wide" style={{ color: GOLD }}>
                Draft Storage Cleanup
              </div>
              <div className="mt-1 text-[12px] text-white/80">
                Deletes unreferenced objects in <span className="font-semibold">drafts/</span> older than N days.
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-700">
            <div className="font-semibold text-[#0a2230]">Safety rules</div>
            <div className="mt-1 text-slate-600">
              Will NOT delete anything referenced by any listing (<code>heroImageUrl</code>, <code>brokerHeroImageUrl</code>,{" "}
              <code>imageUrls</code>) or any user broker logo.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-[13px] font-semibold text-[#0a2230]">Older than</div>
            <input
              className={input}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              inputMode="numeric"
            />
            <div className="text-[13px] text-slate-600">days</div>

            <div className="flex-1" />

            <button className={btnPrimary} disabled={busy} onClick={() => run(true)}>
              {busy ? "Working…" : "Dry run"}
            </button>

            <button
              className={btnDanger}
              disabled={busy}
              onClick={() => {
                clearMessages();
                const ok = window.confirm("Delete unreferenced draft objects now? This cannot be undone.");
                if (!ok) return;
                run(false);
              }}
            >
              {busy ? "Working…" : "Delete now"}
            </button>
          </div>

          {result ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-700">
              <div className="font-semibold text-[#0a2230]">Result</div>
              <div className="mt-2 space-y-1">
                <div>
                  Mode: <span className="font-semibold">{result.mode}</span>
                </div>
                <div>
                  Cutoff: <span className="font-semibold">{result.cutoffDays}</span> days
                </div>
                <div>
                  Scanned: <span className="font-semibold">{result.scanned}</span> objects
                </div>
                <div>
                  Candidates: <span className="font-semibold">{result.candidatesFound}</span>
                </div>

                {result.deletions ? (
                  <div>
                    Deleted:{" "}
                    <span className="font-semibold">
                      {result.deletions.deleted}/{result.deletions.attempted}
                    </span>
                  </div>
                ) : null}

                {result.limited ? (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                    Hit safety cap. Run again to continue.
                  </div>
                ) : null}

                {result.note ? <div className="mt-2 text-slate-600">{result.note}</div> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className={card}>
        <div className="px-5 py-3 bg-[#0a2230] border-b border-black/10">
          <div className="text-[15px] font-extrabold tracking-wide" style={{ color: GOLD }}>
            Non-Live Listing Cleanup
          </div>
          <div className="mt-1 text-[12px] text-white/80">
            Review every non-live listing on the site and permanently remove the ones you no longer need to keep.
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "All non-live", value: "ALL" },
                { label: "Drafts", value: "DRAFT" },
                { label: "Pending Review", value: "PENDING_REVIEW" },
                { label: "Changes Requested", value: "REJECTED" },
                { label: "Archived", value: "ARCHIVED" },
                { label: "Removed", value: "REMOVED" },
              ].map((option) => {
                const active = statusFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={[
                      "inline-flex h-10 items-center justify-center rounded-full border px-4 text-[13px] font-semibold transition",
                      active
                        ? "border-[#c8a44d] bg-[#fff7df] text-[#0a2230]"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "All ages", value: 0 },
                { label: "7+ days inactive", value: 7 },
                { label: "30+ days inactive", value: 30 },
                { label: "60+ days inactive", value: 60 },
              ].map((option) => {
                const active = inactiveDaysFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setInactiveDaysFilter(option.value)}
                    className={[
                      "inline-flex h-10 items-center justify-center rounded-full border px-4 text-[13px] font-semibold transition",
                      active
                        ? "border-[#c8a44d] bg-[#fff7df] text-[#0a2230]"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className="h-10 w-full rounded-xl border border-slate-300 px-3 text-[13px] text-[#0a2230] outline-none focus:ring-2 focus:ring-[#c8a44d]/40 sm:w-[320px]"
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="Search non-live listings by title, owner, email, or ID..."
            />
            <div className="text-[13px] text-slate-600">
              Showing <span className="font-semibold text-[#0a2230]">{filteredDrafts.length}</span> of{" "}
              <span className="font-semibold text-[#0a2230]">{draftListings.length}</span> non-live listings.
              {inactiveDaysFilter > 0 ? ` Filter: ${inactiveDaysFilter}+ inactive days.` : ""}
            </div>
          </div>
          </div>

          {filteredDrafts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-[13px] text-slate-600">
              No non-live listings match your current filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDrafts.map((listing) => {
                const thumbSrc = listingThumbSrc(listing);
                const ageDays = daysSince(listing.updatedAt);
                const busy = draftBusyId === listing.id;
                return (
                  <div
                    key={listing.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_18px_rgba(2,6,23,0.05)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {thumbSrc ? (
                            <img
                              src={thumbSrc}
                              alt={listing.title || "Draft listing photo"}
                              className="h-full w-full object-contain bg-slate-100"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-500">
                              No photo
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="text-[15px] font-extrabold text-[#0a2230]">{listing.title || "Untitled draft"}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(
                                listing.status
                              )}`}
                            >
                              {statusLabel(listing.status)}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                              {ageDays != null ? `${ageDays} day${ageDays === 1 ? "" : "s"} inactive` : "Unknown age"}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-600">
                            <span>Listing ID: {listing.id}</span>
                            <span>Owner: {listing.ownerName}</span>
                            <span className="break-all">Email: {listing.ownerEmail}</span>
                            {listing.ownerBusinessName ? <span>Business: {listing.ownerBusinessName}</span> : null}
                            <span>Images: {listing.imageCount}</span>
                            <span>Created: {fmtDate(listing.createdAt)}</span>
                            <span>Updated: {fmtDate(listing.updatedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:min-w-[220px]">
                        <button
                          type="button"
                          onClick={() => deleteDraftListing(listing)}
                          disabled={busy}
                          className={btnDanger}
                        >
                          {busy ? "Working…" : "Delete Listing"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
