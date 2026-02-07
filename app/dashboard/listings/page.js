// app/dashboard/listings/page.js
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import RowActions from "./RowActions";

export const dynamic = "force-dynamic";

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
  const s = await requireUser();

  const listings = await prisma.listing.findMany({
    where: { ownerId: s.uid },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      plan: true,
      paymentStatus: true,
      previewToken: true,
      updatedAt: true,
    },
  });

  // ✅ Mutually exclusive buckets:
  // Archived ONLY if user explicitly archived it (status === ARCHIVED)
  const archivedListings = listings.filter((l) => l.status === "ARCHIVED");

  // Active: published and not archived
  const activeListings = listings.filter((l) => l.status === "PUBLISHED");

  // Pending: everything else (drafts, ready for checkout, etc.) and NOT archived/published
  const pendingListings = listings.filter(
    (l) => l.status !== "ARCHIVED" && l.status !== "PUBLISHED"
  );

  const Row = (l) => (
    <div
      key={l.id}
      className="border rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white"
    >
      <div>
        <div className="font-medium">{l.title || "(Untitled)"}</div>
        <div className="text-sm text-gray-600">
          Status: {l.status} • Plan: {l.plan} • Payment: {l.paymentStatus}
        </div>
      </div>

      <RowActions id={l.id} status={l.status} previewToken={l.previewToken} />
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Listings</h1>
        <Link className="rounded-md bg-[#c8a44d] px-4 py-2 font-medium" href="/listings/new">
          Create listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="mt-6 text-gray-600">No listings yet.</div>
      ) : (
        <>
          <Section
            title="Pending listings"
            subtitle="Drafts and listings not yet published."
            items={pendingListings}
          >
            {pendingListings.map(Row)}
          </Section>

          <Section
            title="Active listings"
            subtitle="Published and visible on SailboatTrade.com."
            items={activeListings}
          >
            {activeListings.map(Row)}
          </Section>

          <Section
            title="Archived listings"
            subtitle="Archived by you (not visible publicly)."
            items={archivedListings}
          >
            {archivedListings.map(Row)}
          </Section>
        </>
      )}
    </div>
  );
}
