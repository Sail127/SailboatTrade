// app/reset-password/page.js
// DROP-IN: adds show/hide toggle + Suspense wrapper for useSearchParams

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

const GOLD = "#c8a44d";

function EyeIcon({ open }) {
  return open ? (
    // eye-off
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10.6 10.7a2.5 2.5 0 003.5 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9.5 5.4A10.6 10.6 0 0112 5c5.5 0 9.8 4.3 10.9 7-.4 1-1.2 2.4-2.5 3.7M6.1 6.1C4.2 7.5 3 9.4 2.1 12c1.1 2.7 5.4 7 9.9 7 1 0 2-.2 3-.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    // eye
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M2.1 12c1.1-2.7 5.4-7 9.9-7s8.8 4.3 9.9 7c-1.1 2.7-5.4 7-9.9 7s-8.8-4.3-9.9-7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function ResetInner() {
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

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
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-14">
        <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#0a2230]">Set a new password</h1>
          <p className="mt-1 text-sm text-slate-600">
            Choose a strong password (8+ characters).
          </p>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-[#0a2230]">
                New password
              </label>
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPw} />
                {showPw ? "Hide" : "Show"}
              </button>
            </div>

            <input
              className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#0a2230]">
                Confirm password
              </label>
              <input
                className={`h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 ${
                  mismatch ? "border-red-300 focus:ring-red-200" : "focus:ring-[#c8a44d]/40"
                }`}
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              {mismatch ? (
                <div className="mt-2 text-xs font-semibold text-red-600">
                  Passwords do not match.
                </div>
              ) : null}
            </div>

            <button
              disabled={loading}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-5 md:px-8 py-14" />}>
      <ResetInner />
    </Suspense>
  );
}
