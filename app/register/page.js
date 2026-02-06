// app/register/page.js
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useMemo } from "react";
import Link from "next/link";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10.6 10.7a2.5 2.5 0 003.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M9.5 5.4A10.6 10.6 0 0112 5c5.5 0 9.8 4.3 10.9 7-.4 1-1.2 2.4-2.5 3.7M6.1 6.1C4.2 7.5 3 9.4 2.1 12c1.1 2.7 5.4 7 9.9 7 1 0 2-.2 3-.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M2.1 12c1.1-2.7 5.4-7 9.9-7s8.8 4.3 9.9 7c-1.1 2.7-5.4 7-9.9 7s-8.8-4.3-9.9-7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function RegisterInner() {
  const sp = useSearchParams();
  const router = useRouter();

  // preserve next (including if user later adds query params)
  const next = useMemo(() => sp.get("next") || "/dashboard", [sp]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;

    setErr("");
    setSuccess("");

    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim().toLowerCase();

    if (!fn || !ln) return setErr("First and last name are required.");
    if (!em || !em.includes("@")) return setErr("Please enter a valid email.");
    if (!password || password.length < 8) return setErr("Password must be at least 8 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ ensure session cookie is set/kept
        body: JSON.stringify({
          firstName: fn,
          lastName: ln,
          businessName: businessName.trim() || null,
          email: em,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Register failed.");
      }

      // ✅ show confirmation instead of “silent reset”
      setSuccess("Account created successfully! Redirecting to your dashboard…");

      // ✅ small delay so users see the success message
      setTimeout(() => {
        router.replace(next);
        router.refresh();
      }, 700);
    } catch (e2) {
      setErr(e2?.message || "Register failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-14">
        <div className="mx-auto w-full max-w-3xl">
          <div className="grid gap-8 md:grid-cols-5">
            {/* Left: trust + bullets */}
            <div className="md:col-span-2">
              <div className="rounded-2xl border bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-white"
                    style={{ background: NAVY }}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                      <path
                        d="M12 3l8 4v6c0 5-3.5 9-8 9s-8-4-8-9V7l8-4Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 12l2 2 4-4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[#0a2230]">Create your account</h1>
                    <p className="mt-1 text-sm text-slate-600">
                      Post listings, save favorites, and manage your sailboat ads.
                    </p>
                  </div>
                </div>

                <ul className="mt-5 space-y-3 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <span className="mt-0.5 text-emerald-600">
                      <CheckIcon />
                    </span>
                    <span>
                      <span className="font-semibold">Registration is free</span> — list your sailboat and reach buyers.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-0.5 text-emerald-600">
                      <CheckIcon />
                    </span>
                    <span>
                      <span className="font-semibold">We respect your privacy</span> — we will never sell your information.
                    </span>
                  </li>
                </ul>

                <div className="mt-5 rounded-xl border bg-white px-4 py-3 text-xs text-slate-600">
                  Tip: Use a strong password (8+ characters). You can update your profile later.
                </div>
              </div>
            </div>

            {/* Right: form */}
            <div className="md:col-span-3">
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#0a2230]">Account details</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Fields marked with <span className="text-red-500">*</span> are required.
                </p>

                {err ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {err}
                  </div>
                ) : null}

                {success ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    {success}
                  </div>
                ) : null}

                <form onSubmit={onSubmit} className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#0a2230]">
                        First name <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                        placeholder="First"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#0a2230]">
                        Last name <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                        placeholder="Last"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#0a2230]">
                      Business name <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <input
                      className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                      placeholder="Brokerage / Company (optional)"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      autoComplete="organization"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#0a2230]">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>

                  {/* Password + show toggle */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-sm font-semibold text-[#0a2230]">
                        Password <span className="text-red-500">*</span>
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
                      className="h-11 w-full rounded-xl border px-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                      placeholder="8+ characters"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#0a2230]">
                      Confirm password <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 ${
                        mismatch ? "border-red-300 focus:ring-red-200" : "focus:ring-[#c8a44d]/40"
                      }`}
                      type={showPw ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Type it again"
                    />

                    {mismatch ? (
                      <div className="mt-2 text-xs font-semibold text-red-600">Passwords do not match.</div>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full rounded-xl font-semibold disabled:opacity-60"
                    style={{ background: GOLD, color: "black" }}
                  >
                    {loading ? "Creating account..." : "Create account"}
                  </button>

                  <div className="text-sm text-slate-600">
                    Already have an account?{" "}
                    <Link
                      className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
                      href={`/login?next=${encodeURIComponent(next)}`}
                    >
                      Login
                    </Link>
                  </div>

                  <div className="pt-1 text-xs text-slate-500">
                    By creating an account, you agree to our{" "}
                    <Link href="/privacy" className="underline hover:text-slate-700">
                      Privacy Policy
                    </Link>{" "}
                    and{" "}
                    <Link href="/terms" className="underline hover:text-slate-700">
                      Terms
                    </Link>
                    .
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-5 md:px-8 py-14" />}>
      <RegisterInner />
    </Suspense>
  );
}
