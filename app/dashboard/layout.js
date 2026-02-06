// app/dashboard/layout.js
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  const s = await readSession();

  // If not logged in, bounce to login with a "next" return URL
  if (!s?.uid) {
    redirect(`/login?next=${encodeURIComponent("/dashboard")}`);
  }

  return children;
}
