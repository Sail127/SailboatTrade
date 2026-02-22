// app/dashboard/admin/storage/page.js
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
        <div className="text-[12px] font-extrabold tracking-wide text-slate-500">ADMIN</div>
        <h1 className="mt-1 text-2xl font-semibold text-[#0a2230]">Storage Cleanup</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manually delete <span className="font-semibold">unreferenced</span> draft uploads under <code>drafts/</code> older than N days.
        </p>
      </div>

      <DraftCleanupPanel />
    </div>
  );
}