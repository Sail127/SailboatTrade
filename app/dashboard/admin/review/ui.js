// app/dashboard/admin/review/ui.js
"use client";

import { useMemo, useState } from "react";

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

function imageUrlFromKey(key) {
  const v = String(key || "").trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("/dashboard/admin/drafts/")) {
    return `/api/uploads?key=${encodeURIComponent(v.replace(/^\/dashboard\/admin\//, ""))}`;
  }
  if (v.startsWith("dashboard/admin/drafts/")) {
    return `/api/uploads?key=${encodeURIComponent(v.replace(/^dashboard\/admin\//, ""))}`;
  }
  if (v.startsWith("/drafts/")) {
    return `/api/uploads?key=${encodeURIComponent(v.slice(1))}`;
  }
  if (v.startsWith("/")) return v;
  const normalized = v.replace(/^public\//, "");
  if (normalized.startsWith("boats/") || normalized.startsWith("images/")) return `/${normalized}`;
  return `/api/uploads?key=${encodeURIComponent(v)}`;
}

function listingThumbSrc(listing) {
  const candidates = [listing?.heroImageUrl].filter(Boolean);
  if (Array.isArray(listing?.imageUrls) && listing.imageUrls.length > 0) candidates.push(listing.imageUrls[0]);
  const src = candidates.find(Boolean);
  return src ? imageUrlFromKey(src) : null;
}

export default function AdminReviewClient({ initialItems }) {
  const [items, setItems] = useState(Array.isArray(initialItems) ? initialItems : []);
  const [q, setQ] = useState("");
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
                aria-label="Refresh review queue"
                title="Refresh"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
              >
                <span aria-hidden="true" className="text-[18px] leading-none">↻</span>
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
                {filtered.map((x) => {
                  const thumbSrc = listingThumbSrc(x);
                  const isChangeApproval = String(x.reviewType || "").toUpperCase() === "CHANGE_APPROVAL";
                  const changedSections = Array.isArray(x.changedSections) ? x.changedSections : [];
                  return (
                    <div
                      key={x.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex items-start gap-3">
                          <div className="h-[70px] w-[96px] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                            {thumbSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={thumbSrc}
                                alt={`${x.title} hero`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-500">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                          <div className="text-[14px] font-extrabold text-[#0a2230] truncate">
                            {x.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                isChangeApproval
                                  ? "border-amber-300 bg-amber-50 text-amber-800"
                                  : "border-slate-300 bg-slate-50 text-slate-700"
                              }`}
                            >
                              {isChangeApproval ? "Change approval" : "New listing review"}
                            </span>
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
                          {isChangeApproval && changedSections.length ? (
                            <div className="mt-1 text-[12px] text-slate-700">
                              <span className="font-semibold">Changed sections:</span> {changedSections.join(", ")}
                            </div>
                          ) : null}
                        </div>
                        </div>

                        <div className="flex gap-2 sm:items-end">
                          <a
                            href={`/dashboard/admin/review/${encodeURIComponent(x.id)}`}
                            className="inline-flex h-10 items-center justify-center rounded-full bg-[#0a2230] px-6 text-[13px] font-semibold text-[#e7b34a] hover:bg-[#0f2a3b]"
                          >
                            Review
                          </a>
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
    </div>
  );
}
