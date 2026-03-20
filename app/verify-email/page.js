"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

function VerifyInner() {
  const sp = useSearchParams();
  const token = (sp.get("token") || "").trim();

  const [state, setState] = useState({ loading: true, ok: false, msg: "" });

  const canVerify = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!token) {
        setState({ loading: false, ok: false, msg: "Missing verification token." });
        return;
      }

      setState({ loading: true, ok: false, msg: "" });

      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
          method: "GET",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));

        if (!alive) return;

        if (res.ok && data?.ok) {
          setState({ loading: false, ok: true, msg: data?.alreadyVerified ? "Already verified." : "Verified!" });
        } else {
          setState({ loading: false, ok: false, msg: data?.error || "Verification failed." });
        }
      } catch (e) {
        if (!alive) return;
        setState({ loading: false, ok: false, msg: "Verification failed." });
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>
          Email verification
        </h1>

        {state.loading ? (
          <div className="mt-4 rounded-xl border bg-slate-50 px-4 py-3 text-slate-700">
            Verifying…
          </div>
        ) : state.ok ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            {state.msg || "Your email is verified."}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {state.msg || "Verification failed."}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/listings/new"
            className="inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold"
            style={{ background: GOLD, color: NAVY }}
          >
            Create a listing
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-full border px-5 text-sm font-semibold"
            style={{ color: NAVY }}
          >
            Dashboard
          </Link>

          {!state.loading && !state.ok && canVerify ? (
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center rounded-full border px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Go to dashboard to resend
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-6 py-14" />}>
      <VerifyInner />
    </Suspense>
  );
}
