// app/dashboard/listings/page.js
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import RowActions from "./RowActions";

export const dynamic = "force-dynamic";

/** Must match schema rules */
const FREE_PHOTO_LIMIT = 3;
const FREE_EXPIRE_DAYS = 30;
const RENEW_WINDOW_DAYS = 7;

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

function fmtDateShort(d) {
  try {
    return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function imageUrlFromKey(key) {
  const v = String(key || "").trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
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

function statusLabel(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING_REVIEW") return "Admin review";
  if (s === "REJECTED") return "Changes requested";
  if (s === "DRAFT") return "Draft";
  if (s === "PUBLISHED") return "Active";
  if (s === "ARCHIVED") return "Archived";
  if (s === "REMOVED") return "Removed";
  return s || "—";
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING_REVIEW") return "amber";
  if (s === "REJECTED") return "red";
  if (s === "DRAFT") return "slate";
  if (s === "PUBLISHED") return "emerald";
  if (s === "ARCHIVED") return "slate";
  return "slate";
}

function StatusBadge({ status }) {
  const tone = statusTone(status);
  const label = statusLabel(status);

  const map = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold ${map[tone] || map.slate}`}>
      {label}
    </span>
  );
}

function planLabel(listing) {
  const addons = Array.isArray(listing.billingAddons) ? listing.billingAddons : [];

  const hasPhotoPlus = listing.photoPlan === "PHOTO_PLUS_25" || addons.includes("PHOTO_PLUS_25");
  const hasFeatured = !!listing.featuredHome || addons.includes("FEATURED_HOME");

  const parts = [];
  parts.push(hasPhotoPlus ? "Photo Plus (25 photos)" : `Free (${FREE_PHOTO_LIMIT} photos)`);
  if (hasFeatured) parts.push("Featured");
  return parts.join(" + ");
}

function billingLabel(listing) {
  const addons = Array.isArray(listing.billingAddons) ? listing.billingAddons : [];
  const requestedPaid = addons.length > 0;

  switch (String(listing.billingStatus || "FREE").toUpperCase()) {
    case "ACTIVE":
      return "Active";
    case "PAST_DUE":
      return "Past due";
    case "CANCELED":
      return listing.cancelAtPeriodEnd && listing.billingCurrentPeriodEnd
        ? `Canceled (ends ${fmtDateShort(listing.billingCurrentPeriodEnd)})`
        : "Canceled";
    case "FREE":
    default:
      return requestedPaid ? "Checkout required" : "Free";
  }
}

function computeExpiresAt(listing) {
  if (listing.expiresAt) return new Date(listing.expiresAt);
  if (listing.billingCurrentPeriodEnd) return new Date(listing.billingCurrentPeriodEnd);
  if (listing.billingTermMonths) return addMonths(listing.createdAt, listing.billingTermMonths);
  return addDays(listing.createdAt, FREE_EXPIRE_DAYS);
}

function daysUntil(date) {
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function Section({ title, subtitle, items, tone = "slate", children }) {
  const toneClass =
    tone === "yellow" ? "text-amber-700" : tone === "green" ? "text-emerald-700" : "text-[#0a2230]";

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h2 className={`text-lg font-extrabold ${toneClass}`}>{title}</h2>
        {subtitle ? <p className="text-sm text-slate-600 mt-1">{subtitle}</p> : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
          No listings in this section yet.
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}

export default async function MyListings() {
  let s = null;
  try {
    s = await requireUser();
  } catch {
    s = null;
  }

  if (!s?.uid) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-[#0a2230]">My Listings</h1>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-slate-700">
          <div className="font-semibold">You’re not signed in.</div>
          <div className="mt-1 text-sm text-slate-600">Please sign in to view and manage your listings.</div>
          <div className="mt-3 flex gap-3">
            <Link className="rounded-full bg-[#0a2230] px-5 py-2 text-white font-semibold" href="/login">
              Sign in
            </Link>
            <Link className="rounded-full border border-slate-300 px-5 py-2 font-semibold" href="/">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Auto-archive expired *PUBLISHED* listings for THIS user (non-destructive)
  const now = new Date();
  await prisma.listing.updateMany({
    where: {
      ownerId: s.uid,
      status: "PUBLISHED",
      expiresAt: { not: null, lt: now },
    },
    data: { status: "ARCHIVED", featuredHome: false, archivedAt: now },
  });

  const listings = await prisma.listing.findMany({
    where: { ownerId: s.uid },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      previewToken: true,
      createdAt: true,
      updatedAt: true,

      heroImageUrl: true,
      imageUrls: true,

      photoPlan: true,
      featuredHome: true,
      billingStatus: true,
      billingAddons: true,
      billingMonthlyCents: true,
      cancelAtPeriodEnd: true,
      billingCurrentPeriodEnd: true,
      billingTermMonths: true,
      expiresAt: true,
      archivedAt: true,
    },
  });

  const archivedListings = listings.filter((l) => l.status === "ARCHIVED");
  const activeListings = listings.filter((l) => l.status === "PUBLISHED");
  const pendingListings = listings.filter((l) => l.status !== "ARCHIVED" && l.status !== "PUBLISHED");

  const Row = (l) => {
    const plan = planLabel(l);
    const billing = billingLabel(l);
    const thumbSrc = listingThumbSrc(l);

    const monthly =
      typeof l.billingMonthlyCents === "number"
        ? `$${(l.billingMonthlyCents / 100).toFixed(2)}/mo`
        : null;

    const expiresAt = computeExpiresAt(l);
    const expiresLabel = fmtDateShort(expiresAt);
    const dLeft = daysUntil(expiresAt);

    const isPaid = l.photoPlan === "PHOTO_PLUS_25" || !!l.featuredHome;
    const statusUpper = String(l.status || "").toUpperCase();
    const showRenew =
      (statusUpper === "PUBLISHED" || statusUpper === "ARCHIVED") &&
      (statusUpper === "ARCHIVED" || dLeft <= RENEW_WINDOW_DAYS);

    const canEdit = statusUpper !== "PENDING_REVIEW";
    const showUpgrade = !l.featuredHome && statusUpper !== "ARCHIVED" && statusUpper !== "REMOVED";
    const expiresUrgent = dLeft <= RENEW_WINDOW_DAYS;

    return (
      <div
        key={l.id}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_18px_rgba(2,6,23,0.05)] flex flex-col gap-3"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex gap-4">
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {thumbSrc ? (
                <img src={thumbSrc} alt={l.title || "Listing photo"} className="h-full w-full object-contain bg-slate-100" loading="lazy" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[11px] font-semibold text-slate-500">
                  No photo
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="font-extrabold text-[#0a2230] truncate">{l.title || "(Untitled)"}</div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={l.status} />

                {l.featuredHome ? (
                  <span className="inline-flex items-center rounded-full border border-[#c8a44d] bg-[#fff7d6] px-3 py-1 text-[12px] font-semibold text-[#0a2230]">
                    Featured
                  </span>
                ) : null}

                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold ${
                    expiresUrgent
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  Expires: {expiresLabel}
                  {showRenew ? (
                    <span className={`ml-2 ${expiresUrgent ? "text-red-700" : "text-amber-700"}`}>(soon)</span>
                  ) : null}
                </span>
              </div>

              <div className="text-sm text-slate-600 mt-2">
                Plan: <span className="font-semibold">{plan}</span>
                <span className="mx-2 text-slate-300">•</span>
                Billing: <span className="font-semibold">{billing}</span>
                {monthly ? (
                  <>
                    <span className="mx-2 text-slate-300">•</span>
                    <span className="font-semibold">{monthly}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <RowActions
            id={l.id}
            status={l.status}
            previewToken={l.previewToken}
            canEdit={canEdit}
            showRenew={showRenew}
            renewMode={isPaid ? "PAID" : "FREE"}
            showUpgrade={showUpgrade}
            showDangerAction={false}
          />
        </div>

        <div className="min-h-5 flex flex-col gap-1 sm:relative sm:flex-row sm:items-center sm:justify-end">
          <div className="text-xs text-slate-500 sm:absolute sm:left-0">
            Updated: {fmtDate(l.updatedAt)}
          </div>
          <RowActions
            id={l.id}
            status={l.status}
            showPrimaryActions={false}
            showAdminHint={false}
            containerClassName="gap-0 items-end"
            dangerRowClassName="justify-end"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[#0a2230]">My Listings</h1>
        <Link className="rounded-full bg-[#f3b23f] px-5 py-2 font-semibold text-[#0a2230] hover:brightness-95" href="/listings/new">
          Create listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="mt-6 text-slate-600">No listings yet.</div>
      ) : (
        <>
          <Section title="Pending listings" tone="yellow" subtitle="Drafts and listings not yet published." items={pendingListings}>
            {pendingListings.map(Row)}
          </Section>

          <Section title="Active listings" tone="green" subtitle="Published and visible on SailboatTrade.com." items={activeListings}>
            {activeListings.map(Row)}
          </Section>

          <Section
            title="Archived listings"
            subtitle="Archived listings stay private. Photos are retained for 30 days, then all but the hero image are removed."
            items={archivedListings}
          >
            {archivedListings.map(Row)}
          </Section>
        </>
      )}
    </div>
  );
}
