// app/dashboard/SignOutButton.js
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutButton({ className = "" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onClick() {
    if (loading) return;
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      // Even if it fails, we can still navigate to login
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Logout failed");
      }

      // ✅ Refresh auth state + go to login
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setErr(e?.message || "Logout failed");
      // still try to recover gracefully
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={`${className} disabled:opacity-60`}
      >
        {loading ? "Signing out…" : "Sign out"}
      </button>
      {err ? <div className="mt-1 text-[11px] text-red-600">{err}</div> : null}
    </div>
  );
}
