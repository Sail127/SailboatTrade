import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function DashboardHome() {
  await requireUser();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link className="border rounded-lg p-5 hover:shadow" href="/dashboard/listings">
          <div className="font-medium">My Listings</div>
          <div className="text-sm text-gray-600 mt-1">Drafts, published ads, edit & publish.</div>
        </Link>
        <Link className="border rounded-lg p-5 hover:shadow" href="/dashboard/favorites">
          <div className="font-medium">Favorites</div>
          <div className="text-sm text-gray-600 mt-1">Boats you’ve saved.</div>
        </Link>
      </div>
    </div>
  );
}
