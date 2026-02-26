// app/dashboard/admin/review/ui.js
"use client";

import { useMemo, useState } from "react";

const NAVY = "#0a2230";

function planLabel(p) {
  if (!p) return "Standard Listing";
  if (p === "FEATURED_HOME") return "Featured on Homepage";
  if (p === "STANDARD") return "Standard Listing";
  return String(p);
}

function fmt(iso) {
  try {
    return iso ? new Date(iso).toLocaleString() : "";
  } catch {
    return "";
  }
}

export default function AdminReviewClient({ initialItems }) {
  const [items, setItems] = useState(Array.isArray(initialItems) ? initialItems : []);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState("");
  const [msg, setMsg] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => {
      return (
        String(x.id || "").toLowerCase().includes(s) ||
        String(x.title || "").toLowerCase().includes(s) ||
        String(x.ownerEmail || "").toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  async function refresh() {
    setMsg("");
    const res = await fetch("/api/admin/review-queue", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Failed to load queue.");
      return;
    }
    setItems(Array.isArray(data.items) ? data.items : []);
  }

  async function approve(id) {
    setMsg("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/listings/${encodeURIComponent(id)}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Approve failed.");
      setItems((prev) => prev.filter((x) => x.id !== id));
      setMsg("Approved and published.");
    } catch (e) {
      setMsg(e?.message || "Approve failed.");
    } finally {
      setBusyId("");
    }
  }

  async function reject(id) {
    setMsg("");
    const reason = window.prompt("Reason (optional):") || "";
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/listings/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Reject failed.");
      setItems((prev) => prev.filter((x) => x.id !== id));
      setMsg("Sent back to draft.");
    } catch (e) {
      setMsg(e?.message || "Reject failed.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_rgba(2,6,23,0.08)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200">
            <div className="text-[12px] font-extrabold tracking-wide text-slate-600">Admin</div>
            <div className="mt-2 text-[20px] sm:text-[24px] font-extrabold text-[#0a2230]">
              Review Queue
            </div>
            <div className="mt-1 text-[13px] text-slate-600">
              Listings waiting for approval to publish.
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by ID, title, or email…"
                className="h-10 w-full sm:max-w-md rounded-xl border border-slate-300 px-3 text-[13px]"
              />
              <button
                type="button"
                onClick={refresh}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#0a2230] px-6 text-[13px] font-semibold text-white hover:opacity-95"
              >
                Refresh
              </button>
            </div>

            {msg ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
                {msg}
              </div>
            ) : null}
          </div>

          <div className="p-6">
            {filtered.length === 0 ? (
              <div className="text-[13px] text-slate-600">No listings in the queue.</div>
            ) : (
              <div className="space-y-3">
                {filtered.map((x) => (
                  <div
                    key={x.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-[14px] font-extrabold text-[#0a2230] truncate">
                          {x.title}
                        </div>
                        <div className="mt-1 text-[12px] text-slate-600">
                          <span className="font-semibold">Plan:</span> {planLabel(x.plan)}{" "}
                          <span className="text-slate-400">•</span>{" "}
                          <span className="font-semibold">Submitted:</span> {fmt(x.submittedForReviewAt)}{" "}
                          {x.ownerEmail ? (
                            <>
                              <span className="text-slate-400">•</span>{" "}
                              <span className="font-semibold">Owner:</span> {x.ownerEmail}
                            </>
                          ) : null}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-3 text-[13px]">
                          <a
                            href={`/dashboard/admin/review/${encodeURIComponent(x.id)}`}
                            className="font-semibold text-blue-700 underline underline-offset-2"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Preview + approve
                          </a>
                          {x.previewToken ? (
                            <a
                              href={`/listings/preview/${encodeURIComponent(x.previewToken)}`}
                              className="font-semibold text-blue-700 underline underline-offset-2"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open raw preview
                            </a>
                          ) : null}
                          <a
                            href={`/listings/${encodeURIComponent(x.id)}`}
                            className="font-semibold text-blue-700 underline underline-offset-2"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open listing
                          </a>
                        </div>
                      </div>

                      <div className="flex gap-2 sm:flex-col sm:items-end">
                        <button
                          type="button"
                          onClick={() => approve(x.id)}
                          disabled={busyId === x.id}
                          className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-6 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {busyId === x.id ? "Working…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(x.id)}
                          disabled={busyId === x.id}
                          className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50 disabled:opacity-60"
                        >
                          Send back
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 pb-6 text-[12px] text-slate-500">
            Tip: If you don’t see this page, make sure your user role is <span className="font-semibold">ADMIN</span> (or at least meets MODERATOR).
          </div>
        </div>
      </div>
    </div>
  );
}
