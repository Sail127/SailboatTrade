"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const LISTINGS_PER_PAGE = 30;
const SORT_OPTIONS = [
  { value: "updated_desc", label: "Updated: Newest" },
  { value: "updated_asc", label: "Updated: Oldest" },
  { value: "created_desc", label: "Created: Newest" },
  { value: "created_asc", label: "Created: Oldest" },
  { value: "title_asc", label: "Title A-Z" },
  { value: "owner_asc", label: "Owner A-Z" },
  { value: "status_asc", label: "Status" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "price_asc", label: "Price: Low to High" },
];
const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PUBLISHED", label: "Published" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "DRAFT", label: "Draft" },
  { value: "REJECTED", label: "Changes Requested" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "REMOVED", label: "Removed" },
];

function fmtDate(value) {
  try {
    return value ? new Date(value).toLocaleString() : "";
  } catch {
    return "";
  }
}

function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function statusLabel(status) {
  const value = String(status || "").toUpperCase();
  if (value === "DRAFT") return "Draft";
  if (value === "PENDING_REVIEW") return "Pending Review";
  if (value === "REJECTED") return "Changes Requested";
  if (value === "ARCHIVED") return "Archived";
  if (value === "REMOVED") return "Removed";
  if (value === "PUBLISHED") return "Published";
  return value || "Unknown";
}

function statusTone(status) {
  const value = String(status || "").toUpperCase();
  if (value === "PUBLISHED") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (value === "PENDING_REVIEW") return "border-amber-300 bg-amber-50 text-amber-900";
  if (value === "REJECTED") return "border-red-300 bg-red-50 text-red-700";
  if (value === "ARCHIVED") return "border-sky-300 bg-sky-50 text-sky-900";
  if (value === "REMOVED") return "border-zinc-300 bg-zinc-100 text-zinc-700";
  return "border-slate-300 bg-slate-50 text-slate-700";
}

function daysUntil(date) {
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function expirationTextTone(date) {
  if (!date) return "text-slate-600";
  return daysUntil(date) <= 5 ? "text-red-700" : "text-emerald-700";
}

function expirationCountdownLabel(date) {
  if (!date) return "";
  const remaining = daysUntil(date);
  if (remaining <= 0) return "(Expired)";
  return `(Expiring in ${remaining} day${remaining === 1 ? "" : "s"})`;
}

export default function AdminActiveListingsClient({ initialListings, initialFilters = {} }) {
  const [listings, setListings] = useState(Array.isArray(initialListings) ? initialListings : []);
  const [query, setQuery] = useState(String(initialFilters?.q || ""));
  const [statusFilter, setStatusFilter] = useState(String(initialFilters?.status || "ALL").toUpperCase());
  const [ownerIdFilter, setOwnerIdFilter] = useState(String(initialFilters?.ownerId || ""));
  const [sortBy, setSortBy] = useState(String(initialFilters?.sort || "updated_desc"));
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [expandedListingIds, setExpandedListingIds] = useState([]);
  const [expirationDrafts, setExpirationDrafts] = useState({});
  const [upgradeDrafts, setUpgradeDrafts] = useState({});

  const ownerOptions = useMemo(() => {
    const map = new Map();
    for (const listing of listings) {
      const ownerId = String(listing?.ownerId || "").trim();
      if (!ownerId || map.has(ownerId)) continue;
      const ownerName = String(listing?.ownerName || "").trim() || "Unknown owner";
      const ownerEmail = String(listing?.ownerEmail || "").trim();
      map.set(ownerId, {
        value: ownerId,
        label: ownerEmail ? `${ownerName} (${ownerEmail})` : ownerName,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [listings]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, ownerIdFilter, sortBy]);

  useEffect(() => {
    const nextExpirationDrafts = {};
    const nextUpgradeDrafts = {};
    for (const listing of listings) {
      nextExpirationDrafts[listing.id] = toDateInputValue(listing.expiresAt);
      const addons = Array.isArray(listing.billingAddons) ? listing.billingAddons : [];
      nextUpgradeDrafts[listing.id] = {
        photoPlus: listing.photoPlan === "PHOTO_PLUS_25" || addons.includes("PHOTO_PLUS_25"),
        featuredHome: Boolean(listing.featuredHome) || addons.includes("FEATURED_HOME"),
        termMonths: String(listing.billingTermMonths || 1),
      };
    }
    setExpirationDrafts(nextExpirationDrafts);
    setUpgradeDrafts(nextUpgradeDrafts);
  }, [listings]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return listings.filter((listing) => {
      if (statusFilter !== "ALL" && String(listing.status || "").toUpperCase() !== statusFilter) return false;
      if (ownerIdFilter && String(listing.ownerId || "") !== ownerIdFilter) return false;
      if (!search) return true;
      return (
        String(listing.id || "").toLowerCase().includes(search) ||
        String(listing.title || "").toLowerCase().includes(search) ||
        String(listing.ownerEmail || "").toLowerCase().includes(search) ||
        String(listing.ownerName || "").toLowerCase().includes(search) ||
        String(listing.ownerBusinessName || "").toLowerCase().includes(search) ||
        String(listing.status || "").toLowerCase().includes(search)
      );
    });
  }, [listings, query, statusFilter, ownerIdFilter]);

  const sortedListings = useMemo(() => {
    const next = [...filtered];
    next.sort((a, b) => {
      if (sortBy === "updated_asc") return new Date(a?.updatedAt || 0).getTime() - new Date(b?.updatedAt || 0).getTime();
      if (sortBy === "created_desc") return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
      if (sortBy === "created_asc") return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
      if (sortBy === "title_asc") return String(a?.title || "").localeCompare(String(b?.title || ""), undefined, { sensitivity: "base" });
      if (sortBy === "owner_asc") return String(a?.ownerName || "").localeCompare(String(b?.ownerName || ""), undefined, { sensitivity: "base" });
      if (sortBy === "status_asc") return statusLabel(a?.status).localeCompare(statusLabel(b?.status), undefined, { sensitivity: "base" });
      if (sortBy === "price_desc") return (Number(b?.price) || 0) - (Number(a?.price) || 0);
      if (sortBy === "price_asc") return (Number(a?.price) || 0) - (Number(b?.price) || 0);
      return new Date(b?.updatedAt || 0).getTime() - new Date(a?.updatedAt || 0).getTime();
    });
    return next;
  }, [filtered, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedListings.length / LISTINGS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedListings = useMemo(() => {
    const start = (safePage - 1) * LISTINGS_PER_PAGE;
    return sortedListings.slice(start, start + LISTINGS_PER_PAGE);
  }, [safePage, sortedListings]);

  function toggleExpanded(listingId) {
    setExpandedListingIds((prev) => (prev.includes(listingId) ? prev.filter((id) => id !== listingId) : [...prev, listingId]));
  }

  function setUpgradeDraft(listingId, key, value) {
    setUpgradeDrafts((prev) => ({
      ...prev,
      [listingId]: {
        photoPlus: prev[listingId]?.photoPlus ?? false,
        featuredHome: prev[listingId]?.featuredHome ?? false,
        termMonths: prev[listingId]?.termMonths ?? "1",
        [key]: value,
      },
    }));
  }

  async function refreshListings() {
    setMessage("");
    window.location.reload();
  }

  async function returnToDraft(listing) {
    if (!listing?.id || String(listing.status || "").toUpperCase() !== "PUBLISHED") return;

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
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not return listing to draft.");

      setListings((prev) =>
        prev.map((item) =>
          item.id === listing.id
            ? { ...item, status: "DRAFT", expiresAt: null, updatedAt: new Date().toISOString() }
            : item
        )
      );
      setMessage(`Returned "${listing.title || listing.id}" to draft.`);
    } catch (err) {
      setMessage(err?.message || "Could not return listing to draft.");
    } finally {
      setBusyId("");
    }
  }

  async function saveExpiration(listing) {
    if (!listing?.id) return;

    setBusyId(listing.id);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/listings/${encodeURIComponent(listing.id)}/expiration`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresAt: expirationDrafts[listing.id] || "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not update expiration.");

      setListings((prev) =>
        prev.map((item) =>
          item.id === listing.id
            ? {
                ...item,
                expiresAt: data?.listing?.expiresAt || null,
                updatedAt: data?.listing?.updatedAt || item.updatedAt,
              }
            : item
        )
      );
      setMessage(`Updated expiration for "${listing.title || listing.id}".`);
    } catch (err) {
      setMessage(err?.message || "Could not update expiration.");
    } finally {
      setBusyId("");
    }
  }

  async function upgradeListing(listing) {
    if (!listing?.id) return;
    const upgrade = upgradeDrafts[listing.id] || { photoPlus: false, featuredHome: false, termMonths: "1" };
    if (!upgrade.photoPlus && !upgrade.featuredHome) {
      setMessage("Select at least one upgrade before applying it.");
      return;
    }

    setBusyId(listing.id);
    setMessage("");
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(listing.id)}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoPlus: Boolean(upgrade.photoPlus),
          featuredHome: Boolean(upgrade.featuredHome),
          termMonths: Number(upgrade.termMonths || 1),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not upgrade listing.");

      const now = new Date();
      const termMonths = Number(upgrade.termMonths || 1);
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + termMonths);

      setListings((prev) =>
        prev.map((item) =>
          item.id === listing.id
            ? {
                ...item,
                photoPlan: upgrade.photoPlus ? "PHOTO_PLUS_25" : item.photoPlan,
                featuredHome: Boolean(upgrade.featuredHome),
                billingAddons: [
                  ...(upgrade.photoPlus ? ["PHOTO_PLUS_25"] : []),
                  ...(upgrade.featuredHome ? ["FEATURED_HOME"] : []),
                ],
                billingTermMonths: termMonths,
                billingStatus: "ACTIVE",
                expiresAt:
                  String(item.status || "").toUpperCase() === "PUBLISHED" || String(item.status || "").toUpperCase() === "ARCHIVED"
                    ? expiresAt.toISOString()
                    : item.expiresAt,
                status:
                  String(item.status || "").toUpperCase() === "ARCHIVED"
                    ? "PUBLISHED"
                    : ["DRAFT", "REJECTED"].includes(String(item.status || "").toUpperCase())
                    ? "PENDING_REVIEW"
                    : item.status,
                updatedAt: now.toISOString(),
              }
            : item
        )
      );
      setMessage(`Applied upgrade to "${listing.title || listing.id}".`);
    } catch (err) {
      setMessage(err?.message || "Could not upgrade listing.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteListing(listing) {
    if (!listing?.id) return;

    const confirmed = window.confirm(
      `Completely delete "${listing.title || "this listing"}"? \n\nThis permanently removes the listing, its favorites, related listing audit history, and stored listing images. This cannot be undone.`
    );
    if (!confirmed) return;

    setBusyId(listing.id);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/listings/${encodeURIComponent(listing.id)}/delete`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not delete listing.");

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
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[12px] font-extrabold tracking-[0.18em] text-[#8a6a12]">ADMIN CONTROLS</div>
              <h2 className="mt-2 text-2xl font-extrabold text-[#0a2230]">Master Listing View</h2>
              <p className="mt-1 text-sm text-slate-700">
                Find listings by status, user, title, email, or listing ID, then take action from one place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, owner, email, listing ID..."
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

          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#d9c486] bg-white px-3 text-sm font-semibold text-[#0a2230] outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
              aria-label="Filter by listing status"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={ownerIdFilter}
              onChange={(e) => setOwnerIdFilter(e.target.value)}
              className="h-11 rounded-xl border border-[#d9c486] bg-white px-3 text-sm font-semibold text-[#0a2230] outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
              aria-label="Filter by owner"
            >
              <option value="">All Users</option>
              {ownerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-11 rounded-xl border border-[#d9c486] bg-white px-3 text-sm font-semibold text-[#0a2230] outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
              aria-label="Sort listings"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border border-[#e3d3a1] bg-white/80 px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        ) : null}
      </div>

      <div className="p-6">
        {sortedListings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d9c486] bg-white/70 p-5 text-sm text-slate-600">
            No listings match your current filters.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eadba9] bg-white/70 px-4 py-3 text-sm text-slate-600">
              <span>
                Showing {Math.min(sortedListings.length, (safePage - 1) * LISTINGS_PER_PAGE + 1)}-
                {Math.min(sortedListings.length, safePage * LISTINGS_PER_PAGE)} of {sortedListings.length} listings
              </span>
              <span>{LISTINGS_PER_PAGE} per page</span>
            </div>

            {pagedListings.map((listing) => {
              const busy = busyId === listing.id;
              const thumbSrc = listingThumbSrc(listing);
              const price = formatPrice(listing.price, listing.currency);
              const status = String(listing.status || "").toUpperCase();
              const previewHref =
                status === "PUBLISHED"
                  ? `/listings/${encodeURIComponent(listing.id)}`
                  : `/listings/${encodeURIComponent(listing.id)}`;
              const expanded = expandedListingIds.includes(listing.id);
              const expirationValue = expirationDrafts[listing.id] ?? "";
              const upgrade = upgradeDrafts[listing.id] || { photoPlus: false, featuredHome: false, termMonths: "1" };
              const expirationCountdown = expirationCountdownLabel(listing.expiresAt);

              return (
                <div
                  key={listing.id}
                  className="rounded-2xl border border-[#eadba9] bg-white p-4 shadow-[0_8px_18px_rgba(2,6,23,0.05)]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={previewHref}
                          target="_blank"
                          className="block truncate text-[15px] font-extrabold text-[#0a2230] underline-offset-2 hover:text-[#18374a] hover:underline"
                        >
                          {listing.title || "(Untitled)"}
                        </Link>
                        <div className="mt-1 truncate text-[12px] text-slate-500">Listing ID: {listing.id}</div>
                      </div>

                      <div className="shrink-0">
                        <div className="text-right text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Status</div>
                        <div className="mt-1">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(status)}`}>
                            {statusLabel(status)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-x-6 gap-y-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                      <div className="flex flex-wrap gap-x-6 gap-y-3">
                        <div>
                          <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Created</div>
                          <div className="mt-1 text-[13px] font-medium text-[#0a2230]">
                            {fmtDate(listing.createdAt) || "Not set"}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Expiration</div>
                          <div className={`mt-1 text-[13px] font-medium ${expirationTextTone(listing.expiresAt)}`}>
                            {fmtDate(listing.expiresAt) || "Not set"}
                            {expirationCountdown ? <span className="ml-2">{expirationCountdown}</span> : null}
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Owner</div>
                            <div className="mt-1 text-[13px] font-medium text-[#0a2230]">
                              <Link
                                href={`/dashboard/admin/users?userId=${encodeURIComponent(listing.ownerId)}`}
                                className="underline underline-offset-2 hover:text-[#18374a]"
                              >
                                {listing.ownerName}
                              </Link>
                            </div>
                            <div className="truncate text-[12px] text-slate-600">{listing.ownerEmail}</div>
                          </div>

                          <div className="flex shrink-0 items-start">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(listing.id)}
                              aria-label={expanded ? "Collapse listing details" : "Expand listing details"}
                              title={expanded ? "Hide details" : "Show details"}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d9c486] bg-[#fffaf0] text-[#8a6a12] hover:bg-[#fff5dc]"
                            >
                              <span
                                aria-hidden="true"
                                className={`text-lg leading-none transition-transform ${expanded ? "rotate-180" : ""}`}
                              >
                                ▾
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="mt-4 rounded-2xl border border-[#eadba9] bg-[#fffaf0] p-4">
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)]">
                        <div className="space-y-4">
                          <div className="flex min-w-0 gap-4">
                            <div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
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
                                <Link
                                  href={previewHref}
                                  target="_blank"
                                  className="min-w-0 truncate text-[15px] font-extrabold text-[#0a2230] underline-offset-2 hover:text-[#18374a] hover:underline"
                                >
                                  {listing.title || "(Untitled)"}
                                </Link>
                                {price ? <div className="text-sm font-semibold text-slate-700">{price}</div> : null}
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(status)}`}>
                                  {statusLabel(status)}
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
                                {listing.ownerBusinessName ? <span>Business: {listing.ownerBusinessName}</span> : null}
                                <span>Created: {fmtDate(listing.createdAt)}</span>
                                <span>Updated: {fmtDate(listing.updatedAt)}</span>
                                <span>Approved: {fmtDate(listing.reviewedAt) || "Not reviewed"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {status === "PUBLISHED" ? (
                              <Link
                                href={`/listings/${listing.id}`}
                                target="_blank"
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-slate-50"
                              >
                                View Live Listing
                              </Link>
                            ) : status === "PENDING_REVIEW" || status === "REJECTED" ? (
                              <Link
                                href={`/dashboard/admin/review/${listing.id}`}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-slate-50"
                              >
                                Open Review
                              </Link>
                            ) : null}

                            {status === "PUBLISHED" ? (
                              <button
                                type="button"
                                onClick={() => returnToDraft(listing)}
                                disabled={busy}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busy ? "Working..." : "Return to Draft"}
                              </button>
                            ) : null}

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

                        <div className="space-y-4">
                          <div className="rounded-2xl border border-[#eadba9] bg-white p-4">
                            <div className="text-[11px] font-extrabold tracking-[0.14em] text-slate-500">EDIT EXPIRATION</div>
                            <div className="mt-3 flex flex-col gap-3">
                              <input
                                type="date"
                                value={expirationValue}
                                onChange={(e) =>
                                  setExpirationDrafts((prev) => ({
                                    ...prev,
                                    [listing.id]: e.target.value,
                                  }))
                                }
                                className="h-10 rounded-xl border border-[#d9c486] bg-white px-3 text-sm font-semibold text-[#0a2230] outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                              />
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveExpiration(listing)}
                                  disabled={busy}
                                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0a2230] px-4 text-sm font-semibold text-white hover:bg-[#0f2a3b] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {busy ? "Saving..." : "Save Expiration"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpirationDrafts((prev) => ({
                                      ...prev,
                                      [listing.id]: "",
                                    }))
                                  }
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-slate-50"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-[#eadba9] bg-white p-4">
                            <div className="text-[11px] font-extrabold tracking-[0.14em] text-slate-500">UPGRADE LISTING</div>
                            <div className="mt-3 space-y-3">
                              <div className="grid gap-2">
                              <label className="grid grid-cols-[18px_minmax(0,1fr)] items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#0a2230]">
                                <input
                                  type="checkbox"
                                  checked={Boolean(upgrade.photoPlus)}
                                  onChange={(e) => setUpgradeDraft(listing.id, "photoPlus", e.target.checked)}
                                  className="mt-0.5"
                                />
                                <span className="leading-5">Photo Plus (25 photos)</span>
                              </label>
                              <label className="grid grid-cols-[18px_minmax(0,1fr)] items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#0a2230]">
                                <input
                                  type="checkbox"
                                  checked={Boolean(upgrade.featuredHome)}
                                  onChange={(e) => setUpgradeDraft(listing.id, "featuredHome", e.target.checked)}
                                  className="mt-0.5"
                                />
                                <span className="leading-5">Featured Home placement</span>
                              </label>
                              </div>
                              <select
                                value={String(upgrade.termMonths || "1")}
                                onChange={(e) => setUpgradeDraft(listing.id, "termMonths", e.target.value)}
                                className="h-10 w-full rounded-xl border border-[#d9c486] bg-white px-3 text-sm font-semibold text-[#0a2230] outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                              >
                                <option value="1">1 month</option>
                                <option value="3">3 months</option>
                                <option value="6">6 months</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => upgradeListing(listing)}
                                disabled={busy}
                                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#0a2230] px-4 text-sm font-semibold text-white hover:bg-[#0f2a3b] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busy ? "Applying..." : "Apply Upgrade"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d9c486] bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-[#fffaf0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="px-2 text-sm text-slate-600">
                  Page {safePage} of {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safePage >= totalPages}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d9c486] bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-[#fffaf0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
