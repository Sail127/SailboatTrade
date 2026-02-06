import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const gate = await requireAdminApi("MODERATOR");
  if (!gate.ok) throw new Error(gate.error);

  const pending = await prisma.listing.count({ where: { status: "PENDING_REVIEW" } });
  const removed = await prisma.listing.count({ where: { status: "REMOVED" } });

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <h1 className="text-2xl font-semibold text-[#0a2230]">Admin Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/admin/listings" className="rounded-2xl border bg-white p-5 hover:shadow">
          <div className="font-semibold text-[#0a2230]">Listings Queue</div>
          <div className="mt-1 text-sm text-slate-600">{pending} pending review</div>
        </Link>

        <Link href="/admin/listings?status=REMOVED" className="rounded-2xl border bg-white p-5 hover:shadow">
          <div className="font-semibold text-[#0a2230]">Removed Listings</div>
          <div className="mt-1 text-sm text-slate-600">{removed} removed</div>
        </Link>
      </div>
    </div>
  );
}
