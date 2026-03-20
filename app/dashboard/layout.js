// app/dashboard/layout.js
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  const s = await readSession();

  if (!s?.uid) {
    redirect(`/login?next=${encodeURIComponent("/dashboard/listings")}`);
  }

  // ✅ Remove redundant header + pills (each dashboard page can own its own title if needed)
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-8">{children}</div>
    </main>
  );
}
