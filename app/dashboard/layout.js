// app/dashboard/layout.js
import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  const s = await readSession();

  // ✅ Preserve the actual requested dashboard route
  // (Best effort: layout runs per route segment; we can’t reliably read the full path here,
  // so we default to /dashboard. Individual pages can still pass their own next.)
  if (!s?.uid) {
    redirect(`/login?next=${encodeURIComponent("/dashboard/listings")}`);
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0a2230]">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage your listings and account settings.
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/listings"
              className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
            >
              My Listings
            </Link>

            <Link
              href="/dashboard/account"
              className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
            >
              Account
            </Link>
          </nav>
        </div>

        {children}
      </div>
    </main>
  );
}
