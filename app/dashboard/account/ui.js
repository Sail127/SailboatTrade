// app/dashboard/account/ui.js
"use client";

import { useMemo, useState } from "react";
import { notifyAuthChanged } from "@/lib/auth-client";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="p-5 border-b">
          <div className="text-lg font-bold text-[#0a2230]">{title}</div>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function AccountUI({ user }) {
  const verified = Boolean(user?.emailVerifiedAt);

  const displayName = useMemo(() => {
    const fn = (user?.firstName || "").trim();
    const ln = (user?.lastName || "").trim();
    if (fn || ln) return `${fn} ${ln}`.trim();
    return (user?.name || "").trim();
  }, [user]);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Delete modal + action
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  async function deleteAccount() {
    setDeleting(true);
    setDeleteErr("");
    setNotice("");
    setError("");

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      // ✅ Immediately tell the SPA header "auth changed"
      try {
        notifyAuthChanged();
      } catch {}

      // ✅ Hard redirect guarantees cookies + server components are fresh
      window.location.href = "/";
    } catch (e) {
      setDeleteErr(e?.message || "Failed to delete account.");
      setDeleting(false);
    }
  }

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Single clean account panel */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0a2230]">Account</h1>

              <div className="mt-4 grid gap-2 text-sm text-slate-700">
                <div>
                  <span className="font-semibold text-slate-900">Email:</span>{" "}
                  <span className="font-semibold">{user?.email || ""}</span>
                </div>

                {displayName ? (
                  <div>
                    <span className="font-semibold text-slate-900">Name:</span> {displayName}
                  </div>
                ) : null}

                <div>
                  <span className="font-semibold text-slate-900">Created:</span>{" "}
                  {user?.createdAt ? fmtDate(user.createdAt) : ""}
                </div>

                <div>
                  <span className="font-semibold text-slate-900">Email status:</span>{" "}
                  {verified ? (
                    <span className="text-emerald-700 font-semibold">Verified</span>
                  ) : (
                    <span className="text-amber-700 font-semibold">Not verified</span>
                  )}
                  {verified && user?.emailVerifiedAt ? (
                    <span className="ml-2 text-xs text-slate-500">
                      ({fmtDate(user.emailVerifiedAt)})
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/dashboard"
                className="h-10 inline-flex items-center rounded-full border px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50"
              >
                Back to Dashboard
              </a>
            </div>
          </div>

          {notice ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {/* Minimal delete option */}
          <div className="mt-8 pt-6 border-t flex items-center justify-between">
            <div className="text-xs text-slate-500">Need to remove your account?</div>
            <button
              type="button"
              onClick={() => setOpenDelete(true)}
              className="text-sm font-semibold text-red-600 hover:text-red-700 hover:underline underline-offset-4"
            >
              Delete account
            </button>
          </div>
        </div>

        {/* Confirm modal */}
        <Modal
          open={openDelete}
          title="Delete your account?"
          onClose={() => (deleting ? null : setOpenDelete(false))}
        >
          <p className="text-sm text-slate-700">
            This permanently deletes your account and your listings. This action cannot be undone.
          </p>

          {deleteErr ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {deleteErr}
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              className="h-10 rounded-full border px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50 disabled:opacity-60"
              onClick={() => setOpenDelete(false)}
              disabled={deleting}
            >
              Cancel
            </button>

            <button
              type="button"
              className="h-10 rounded-full px-5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "#dc2626" }}
              onClick={deleteAccount}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
          </div>
        </Modal>

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-[#0a2230]">Support</div>
          <div className="mt-2 text-sm text-slate-600">
            If you need help, contact support and we’ll take care of you.
          </div>
        </div>
      </div>
    </div>
  );
}
