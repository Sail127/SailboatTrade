import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminListings({ searchParams }) {
  const gate = await requireAdminApi("MODERATOR");
  if (!gate.ok) throw new Error(gate.error);

  const status = (searchParams?.status || "PENDING_REVIEW").toString().toUpperCase();
  const q = (searchParams?.q || "").toString().trim();

  const where = {
    status,
    ...(q
      ? {
          OR: [
            { id: { contains: q } },
            { title: { contains: q, mode: "insensitive" } },
            { owner: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const listings = await prisma.listing.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { owner: { select: { email: true } } },
    take: 100,
  });

  const tabs = ["PENDING_REVIEW", "REJECTED", "PUBLISHED", "ARCHIVED", "REMOVED"];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <h1 className="text-2xl font-semibold text-[#0a2230]">Listings</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t}
            href={`/admin/listings?status=${t}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold border ${
              t === status ? "bg-[#0a2230] text-white border-[#0a2230]" : "bg-white text-[#0a2230] border-slate-200"
            }`}
          >
            {t.replaceAll("_", " ")}
          </Link>
        ))}
      </div>

      <form className="mt-4" action="/admin/listings" method="GET">
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by title, id, owner email…"
          className="w-full max-w-xl rounded-xl border px-4 py-2 text-sm"
        />
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left px-4 py-3">Listing</th>
              <th className="text-left px-4 py-3">Owner</th>
              <th className="text-left px-4 py-3">Payment</th>
              <th className="text-left px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-3">
                  <Link className="font-semibold text-[#0a2230] hover:underline" href={`/admin/listings/${l.id}`}>
                    {l.title || `${l.year || ""} ${l.builder || ""} ${l.model || ""}`.trim() || l.id}
                  </Link>
                  <div className="text-xs text-slate-500">{l.id}</div>
                </td>
                <td className="px-4 py-3">{l.owner?.email || "-"}</td>
                <td className="px-4 py-3">{l.paymentStatus}</td>
                <td className="px-4 py-3">{new Date(l.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {!listings.length && (
              <tr>
                <td className="px-4 py-8 text-slate-600" colSpan={4}>
                  No listings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
