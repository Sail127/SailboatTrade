// app/dashboard/admin/storage/page.js
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminApi } from "@/lib/admin";
import DraftCleanupPanel from "./DraftCleanupPanel";

export const dynamic = "force-dynamic";

export default async function AdminStoragePage() {
  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-extrabold tracking-wide text-slate-500">ADMIN</div>
            <h1 className="mt-1 text-2xl font-semibold text-[#0a2230]">Storage Cleanup</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manually delete <span className="font-semibold">unreferenced</span> draft uploads under <code>drafts/</code> older than N days.
            </p>
          </div>

          <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin/users"
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
          >
            User Management
          </Link>
          <Link
            href="/dashboard/admin/email-health"
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
          >
            Email Health
          </Link>
          <Link
            href="/dashboard/admin/email-previews"
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
          >
            Email Previews
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#0a2230] px-5 text-[13px] font-semibold text-white hover:bg-[#0f2a3b]"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <DraftCleanupPanel />
    </div>
  );
}
