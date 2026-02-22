// app/dashboard/listings/page.js
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import RowActions from "./RowActions";

export const dynamic = "force-dynamic";

/** Must match NewListingForm + schema */
const FREE_PHOTO_LIMIT = 3;

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

function planLabel(listing) {
  const addons = Array.isArray(listing.billingAddons) ? listing.billingAddons : [];

  // Photo Plus can be indicated either by photoPlan or addon
  const hasPhotoPlus =
    listing.photoPlan === "PHOTO_PLUS_25" || addons.includes("PHOTO_PLUS_25");

  // Featured can be active (featuredHome true) or requested (addon present)
  const hasFeatured =
    !!listing.featuredHome || addons.includes("FEATURED_HOME");

  const parts = [];
  parts.push(hasPhotoPlus ? "Photo Plus (25 photos)" : `Free (${FREE_PHOTO_LIMIT} photos)`);

  if (hasFeatured) parts.push("Featured Home");

  return parts.join(" + ");
}

function billingLabel(listing) {
  const addons = Array.isArray(listing.billingAddons) ? listing.billingAddons : [];
  const requestedPaid = addons.length > 0;

  switch (listing.billingStatus) {
    case "ACTIVE":
      return "Active";
    case "PAST_DUE":
      return "Past due";
    case "CANCELED":
      // If you want, you can show period end when selected; we already select billingCurrentPeriodEnd below.
      return listing.cancelAtPeriodEnd && listing.billingCurrentPeriodEnd
        ? `Canceled (ends ${fmtDate(listing.billingCurrentPeriodEnd)})`
        : "Canceled";
    case "FREE":
    default:
      return requestedPaid ? "Checkout required" : "Free";
  }
}

function Section({ title, subtitle, items, children }) {
  return (
    <section className="mt-8">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-[#0a2230]">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-600 mt-1">{subtitle}</p> : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          No listings in this section yet.
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}

export default async function MyListings() {
  // ✅ Pages should render UI, not NextResponse.json()
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
          <div className="mt-1 text-sm text-slate-600">
            Please sign in to view and manage your listings.
          </div>
          <div className="mt-3 flex gap-3">
            <Link className="rounded-md bg-[#0a2230] px-4 py-2 text-white font-medium" href="/login">
              Sign in
            </Link>
            <Link className="rounded-md border border-slate-300 px-4 py-2 font-medium" href="/">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const listings = await prisma.listing.findMany({
    where: { ownerId: s.uid },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      previewToken: true,
      updatedAt: true,

      // ✅ Real schema fields (replace old plan/paymentStatus)
      photoPlan: true,
      featuredHome: true,
      billingStatus: true,
      billingAddons: true,
      billingMonthlyCents: true,
      cancelAtPeriodEnd: true,
      billingCurrentPeriodEnd: true,
    },
  });

  // ✅ Mutually exclusive buckets
  const archivedListings = listings.filter((l) => l.status === "ARCHIVED");
  const activeListings = listings.filter((l) => l.status === "PUBLISHED");
  const pendingListings = listings.filter((l) => l.status !== "ARCHIVED" && l.status !== "PUBLISHED");

  const Row = (l) => {
    const plan = planLabel(l);
    const billing = billingLabel(l);

    const monthly =
      typeof l.billingMonthlyCents === "number"
        ? `$${(l.billingMonthlyCents / 100).toFixed(2)}/mo`
        : null;

    return (
      <div
        key={l.id}
        className="border rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white"
      >
        <div className="min-w-0">
          <div className="font-medium text-[#0a2230] truncate">{l.title || "(Untitled)"}</div>
          <div className="text-sm text-slate-600 mt-1">
            Status: <span className="font-semibold">{l.status}</span>
            <span className="mx-2 text-slate-300">•</span>
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
          <div className="text-xs text-slate-500 mt-1">Updated: {fmtDate(l.updatedAt)}</div>
        </div>

        <RowActions id={l.id} status={l.status} previewToken={l.previewToken} />
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[#0a2230]">My Listings</h1>
        <Link className="rounded-md bg-[#c8a44d] px-4 py-2 font-medium" href="/listings/new">
          Create listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="mt-6 text-slate-600">No listings yet.</div>
      ) : (
        <>
          <Section title="Pending listings" subtitle="Drafts and listings not yet published." items={pendingListings}>
            {pendingListings.map(Row)}
          </Section>

          <Section title="Active listings" subtitle="Published and visible on SailboatTrade.com." items={activeListings}>
            {activeListings.map(Row)}
          </Section>

          <Section title="Archived listings" subtitle="Archived by you (not visible publicly)." items={archivedListings}>
            {archivedListings.map(Row)}
          </Section>
        </>
      )}
    </div>
  );
}