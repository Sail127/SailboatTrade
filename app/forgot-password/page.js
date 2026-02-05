// app/forgot-password/page.js
"use client";

import { useState } from "react";
import Link from "next/link";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setLoading(false);
    setSent(true);
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-14">
        <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#0a2230]">Password help</h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter your email and we’ll send a reset link.
          </p>

          {sent ? (
            <div className="mt-4 rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
              If an account exists for that email, you’ll receive a reset link shortly.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#0a2230]">
                  Email
                </label>
                <input
                  className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <button
                disabled={loading}
                className="h-11 w-full rounded-xl font-semibold text-black disabled:opacity-60"
                style={{ background: GOLD }}
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

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
