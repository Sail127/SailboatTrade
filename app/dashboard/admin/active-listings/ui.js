"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

function fmtDate(value) {
  try {
    return value ? new Date(value).toLocaleString() : "";
  } catch {
    return "";
  }
}

function formatPrice(price, currency = "USD") {
  const amount = Number(price);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency || "USD").toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${String(currency || "USD").toUpperCase()} ${amount.toLocaleString()}`;
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

function planLabel(listing) {
  const addons = Array.isArray(listing?.billingAddons) ? listing.billingAddons : [];
  const hasPhotoPlus = listing?.photoPlan === "PHOTO_PLUS_25" || addons.includes("PHOTO_PLUS_25");
  const hasFeatured = Boolean(listing?.featuredHome) || addons.includes("FEATURED_HOME");

  const parts = [];
  parts.push(hasPhotoPlus ? "Photo Plus (25)" : "Free (3)");
  if (hasFeatured) parts.push("Featured");
  return parts.join(" • ");
}

export default function AdminActiveListingsClient({ initialListings }) {
  const [listings, setListings] = useState(Array.isArray(initialListings) ? initialListings : []);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return listings;
    return listings.filter((listing) => {
      return (
        String(listing.id || "").toLowerCase().includes(search) ||
        String(listing.title || "").toLowerCase().includes(search) ||
        String(listing.ownerEmail || "").toLowerCase().includes(search) ||
        String(listing.ownerName || "").toLowerCase().includes(search) ||
        String(listing.ownerBusinessName || "").toLowerCase().includes(search)
      );
    });
  }, [listings, query]);

  async function refreshListings() {
    setMessage("");
    const res = await fetch(window.location.pathname, { cache: "no-store" });
    if (!res.ok) {
      setMessage("Could not refresh listings.");
      return;
    }
    window.location.reload();
  }

  async function returnToDraft(listing) {
    if (!listing?.id) return;

    const confirmed = window.confirm(
      `Return "${listing.title || "this listing"}" to draft?\n\nIt will immediately come off the live site and the seller will need to resubmit it.`
    );
    if (!confirmed) return;

    setBusyId(listing.id);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/listings/${encodeURIComponent(listing.id)}/return-to-draft`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not return listing to draft.");
      }

      setListings((prev) => prev.filter((item) => item.id !== listing.id));
      setMessage(`Returned "${listing.title || listing.id}" to draft.`);
    } catch (err) {
      setMessage(err?.message || "Could not return listing to draft.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteListing(listing) {
    if (!listing?.id) return;

    const confirmed = window.confirm(
      `Completely delete "${listing.title || "this listing"}"? \n\nThis permanently removes the live listing, its favorites, related listing audit history, and stored listing images. This cannot be undone.`
    );
    if (!confirmed) return;

    setBusyId(listing.id);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/listings/${encodeURIComponent(listing.id)}/delete`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not delete listing.");
      }

      setListings((prev) => prev.filter((item) => item.id !== listing.id));
      setMessage(`Deleted "${data?.deletedTitle || listing.title || listing.id}".`);
    } catch (err) {
      setMessage(err?.message || "Could not delete listing.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="rounded-3xl border border-[#e7d7a6] bg-[linear-gradient(180deg,#fffdf7_0%,#fff7df_100%)] shadow-[0_16px_35px_rgba(2,6,23,0.08)]">
      <div className="border-b border-[#eadba9] px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[12px] font-extrabold tracking-[0.18em] text-[#8a6a12]">ADMIN CONTROLS</div>
            <h2 className="mt-2 text-2xl font-extrabold text-[#0a2230]">Live Listing Management</h2>
            <p className="mt-1 text-sm text-slate-700">
              Review every active listing and take immediate action if something needs to come offline.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, owner, email, or listing ID..."
              className="h-11 w-full rounded-xl border border-[#d9c486] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40 sm:w-[320px]"
            />
            <button
              type="button"
              onClick={refreshListings}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d9c486] bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-[#fffaf0]"
            >
              Refresh
            </button>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border border-[#e3d3a1] bg-white/80 px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        ) : null}
      </div>

      <div className="p-6">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d9c486] bg-white/70 p-5 text-sm text-slate-600">
            No active listings match your current search.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((listing) => {
              const busy = busyId === listing.id;
              const thumbSrc = listingThumbSrc(listing);
              const price = formatPrice(listing.price, listing.currency);
              return (
                <div
                  key={listing.id}
                  className="rounded-2xl border border-[#eadba9] bg-white p-4 shadow-[0_8px_18px_rgba(2,6,23,0.05)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt={listing.title || "Listing photo"}
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
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <div className="min-w-0 truncate text-[15px] font-extrabold text-[#0a2230]">
                            {listing.title || "(Untitled)"}
                          </div>
                          {price ? <div className="text-sm font-semibold text-slate-700">{price}</div> : null}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                            Live
                          </span>
                          {listing.featuredHome ? (
                            <span className="inline-flex items-center rounded-full border border-[#c8a44d] bg-[#fff7d6] px-2.5 py-1 text-[11px] font-semibold text-[#0a2230]">
                              Featured
                            </span>
                          ) : null}
                          <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            {planLabel(listing)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-600">
                          <span>Listing ID: {listing.id}</span>
                          <span>Owner: {listing.ownerName}</span>
                          <span className="break-all">Email: {listing.ownerEmail}</span>
                          {listing.ownerBusinessName ? <span>Business: {listing.ownerBusinessName}</span> : null}
                          <span>Updated: {fmtDate(listing.updatedAt)}</span>
                          <span>Approved: {fmtDate(listing.reviewedAt) || "Unknown"}</span>
                          <span>Expires: {fmtDate(listing.expiresAt) || "Not set"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:min-w-[220px]">
                      <Link
                        href={`/listings/${listing.id}`}
                        target="_blank"
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-slate-50"
                      >
                        View Live Listing
                      </Link>

                      <button
                        type="button"
                        onClick={() => returnToDraft(listing)}
                        disabled={busy}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy ? "Working..." : "Return to Draft"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteListing(listing)}
                        disabled={busy}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy ? "Working..." : "Delete Listing"}
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
  );
}
