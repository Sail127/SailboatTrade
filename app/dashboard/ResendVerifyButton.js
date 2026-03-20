"use client";

import { useState } from "react";

export default function ResendVerifyButton({ className = "" }) {
  const [state, setState] = useState({ loading: false, msg: "", ok: false });

  async function resend() {
    setState({ loading: true, msg: "", ok: false });
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Failed to resend.");

      if (data?.alreadyVerified) {
        setState({ loading: false, ok: true, msg: "Your email is already verified." });
      } else {
        setState({ loading: false, ok: true, msg: "Verification email sent. Check your inbox." });
      }
    } catch (e) {
      setState({ loading: false, ok: false, msg: e?.message || "Failed to resend." });
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={resend}
        disabled={state.loading}
        className="inline-flex h-10 items-center rounded-full bg-[#c8a44d] px-5 text-sm font-semibold text-[#0a2230] hover:brightness-95 disabled:opacity-60"
      >
        {state.loading ? "Sending…" : "Resend verification email"}
      </button>

      {state.msg ? (
        <div className={`mt-2 text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
          {state.msg}
        </div>
      ) : null}
    </div>
  );
}
