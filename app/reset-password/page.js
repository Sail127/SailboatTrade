"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const GOLD = "#c8a44d";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!token) return setErr("Missing reset token.");
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok || !data.ok) return setErr(data?.error || "Reset failed.");

    router.push("/login?reset=1");
    router.refresh();
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-14">
        <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#0a2230]">Set a new password</h1>
          <p className="mt-1 text-sm text-slate-600">Choose a strong password (8+ characters).</p>

          {!token ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Missing reset token. Please use the link from your email again.
            </div>
          ) : null}

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#0a2230]">
                New password
              </label>
              <input
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#0a2230]">
                Confirm password
              </label>
              <input
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button
              disabled={loading || !token}
              className="h-11 w-full rounded-xl font-semibold text-black disabled:opacity-60"
              style={{ background: GOLD }}
            >
              {loading ? "Saving..." : "Reset password"}
            </button>
          </form>

          <div className="mt-4 text-sm text-slate-600">
            Back to{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function ResetPasswordSkeleton() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-14">
        <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <div className="h-6 w-48 rounded bg-slate-100" />
          <div className="mt-2 h-4 w-72 rounded bg-slate-100" />
          <div className="mt-6 space-y-4">
            <div className="h-11 w-full rounded-xl bg-slate-100" />
            <div className="h-11 w-full rounded-xl bg-slate-100" />
            <div className="h-11 w-full rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    </main>
  );
}
