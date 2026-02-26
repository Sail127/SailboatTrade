// app/login/page.js
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useMemo, useEffect } from "react";
import Link from "next/link";

const GOLD = "#c8a44d";
const EMAILS_STORAGE_KEY = "sbt_login_emails";
const LAST_EMAIL_STORAGE_KEY = "sbt_login_last_email";
const MAX_SAVED_EMAILS = 6;

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function readRememberedEmails() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EMAILS_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => normalizeEmail(x))
      .filter(Boolean)
      .slice(0, MAX_SAVED_EMAILS);
  } catch {
    return [];
  }
}

function saveRememberedEmails(emails) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EMAILS_STORAGE_KEY, JSON.stringify(emails.slice(0, MAX_SAVED_EMAILS)));
  } catch {
    // ignore localStorage write failures
  }
}

function saveLastEmail(email) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_EMAIL_STORAGE_KEY, normalizeEmail(email));
  } catch {
    // ignore localStorage write failures
  }
}

function readLastEmail() {
  if (typeof window === "undefined") return "";
  try {
    return normalizeEmail(localStorage.getItem(LAST_EMAIL_STORAGE_KEY) || "");
  } catch {
    return "";
  }
}

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function LoginInner() {
  const sp = useSearchParams();
  const router = useRouter();

  const rawNext = sp.get("next") || "/dashboard";
  const reset = sp.get("reset") === "1";
  const notice = String(sp.get("notice") || "").trim();
  const showContactInfoNotice = notice === "contact_info_required";

  // ✅ ONLY special-case the listing flow
  const next = useMemo(() => {
    const n = String(rawNext || "/dashboard");
    return n.startsWith("/listings/new") ? "/dashboard/listings" : n;
  }, [rawNext]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [rememberedEmails, setRememberedEmails] = useState([]);

  useEffect(() => {
    const remembered = readRememberedEmails();
    setRememberedEmails(remembered);

    const last = readLastEmail();
    if (!email && last) setEmail(last);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErr(data?.error || "Login failed.");
        return;
      }

      const normalized = normalizeEmail(email);
      if (normalized) {
        if (rememberEmail) {
          const nextSaved = [normalized, ...rememberedEmails.filter((x) => x !== normalized)].slice(
            0,
            MAX_SAVED_EMAILS
          );
          saveRememberedEmails(nextSaved);
          saveLastEmail(normalized);
          setRememberedEmails(nextSaved);
        } else {
          const nextSaved = rememberedEmails.filter((x) => x !== normalized);
          saveRememberedEmails(nextSaved);
          saveLastEmail("");
          setRememberedEmails(nextSaved);
        }
      }

      // ✅ go where we decided above
      router.replace(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white">
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

          {showContactInfoNotice ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Users must be logged in with a valid account to see contact information.
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
              <datalist id="login-remembered-emails">
                {rememberedEmails.map((saved) => (
                  <option key={saved} value={saved} />
                ))}
              </datalist>
              <input
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                list="login-remembered-emails"
              />
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-[12px] text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  style={{ accentColor: "#0a2230" }}
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                />
                Remember email on this device
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#0a2230]">
                Password
              </label>

              <div className="relative">
                <input
                  className="h-11 w-full rounded-xl border px-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-700 hover:bg-slate-100"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  title={showPw ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>

              <div className="mt-2">
                <Link
                  href="/forgot-password"
                  className="text-[13px] font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              className="h-11 w-full rounded-xl font-semibold text-black disabled:opacity-60"
              style={{ background: GOLD }}
              disabled={loading}
            >
              {loading ? "Signing in…" : "Login"}
            </button>
          </form>

          <div className="mt-4 text-sm text-slate-600">
            No account?{" "}
            <Link
              className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
              href={`/register?next=${encodeURIComponent(rawNext)}`}
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-5 md:px-8 py-14" />}>
      <LoginInner />
    </Suspense>
  );
}
