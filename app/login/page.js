"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const GOLD = "#c8a44d";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";
  const reset = sp.get("reset") === "1";
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      setErr(data?.error || "Login failed.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-14">
        <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#0a2230]">Login</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in to manage listings and favorites.
          </p>

          {reset ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Password updated. Please log in with your new password.
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

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-semibold text-[#0a2230]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>

              <input
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              className="h-11 w-full rounded-xl font-semibold text-black"
              style={{ background: GOLD }}
            >
              Login
            </button>
          </form>

          <div className="mt-4 text-sm text-slate-600">
            No account?{" "}
            <Link
              className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
              href={`/register?next=${encodeURIComponent(next)}`}
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginSkeleton() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-14">
        <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <div className="h-6 w-24 rounded bg-slate-100" />
          <div className="mt-2 h-4 w-64 rounded bg-slate-100" />
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
