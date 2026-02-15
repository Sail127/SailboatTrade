// app/dashboard/account/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notifyAuthChanged } from "@/lib/auth-client";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

const labelBase = "mb-2 block text-sm font-semibold text-[#0a2230]";
const inputBase =
  "h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40";
const btnPrimary =
  "inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-black disabled:opacity-60";
const btnGhost =
  "inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold border border-slate-300 text-[#0a2230] hover:bg-slate-50";

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0a2230]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
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

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [profile, setProfile] = useState(null);

  // editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [sellerRole, setSellerRole] = useState("OWNER");
  const [businessName, setBusinessName] = useState("");

  const [brokerageName, setBrokerageName] = useState("");
  const [brokerageStreet, setBrokerageStreet] = useState("");
  const [brokerageCity, setBrokerageCity] = useState("");
  const [brokerageState, setBrokerageState] = useState("");
  const [brokerageCountry, setBrokerageCountry] = useState("");

  // password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");

  // ✅ Restore old delete behavior (modal + POST /api/account/delete + notifyAuthChanged + hard redirect)
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  const emailVerified = Boolean(profile?.emailVerified);
  const isBroker = sellerRole === "BROKER";

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");
      setOkMsg("");

      try {
        const res = await fetch("/api/account/profile", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));

        if (!alive) return;

        // ✅ Only redirect on AUTH_REQUIRED (401)
        if (res.status === 401 || data?.error === "AUTH_REQUIRED") {
          window.location.assign(`/login?next=${encodeURIComponent("/dashboard/account")}`);
          return;
        }

        if (!res.ok || !data.ok) {
          throw new Error(data?.error || "Could not load account details.");
        }

        // ✅ Our API returns { profile: {...} }
        const u = data.profile;
        setProfile(u);

        setFirstName(u.firstName || "");
        setLastName(u.lastName || "");
        setPhoneE164(u.phoneE164 || "");
        setSellerRole(u.sellerRole || "OWNER");
        setBusinessName(u.businessName || "");

        setBrokerageName(u.brokerageName || "");
        setBrokerageStreet(u.brokerageStreet || "");
        setBrokerageCity(u.brokerageCity || "");
        setBrokerageState(u.brokerageState || "");
        setBrokerageCountry(u.brokerageCountry || "");
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Could not load account details.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  async function saveProfile() {
    setSaving(true);
    setErr("");
    setOkMsg("");

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH", // ✅ matches the API route
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phoneE164: phoneE164.trim() ? phoneE164.trim() : "", // empty clears
          sellerRole,
          businessName: businessName.trim() ? businessName.trim() : "",

          brokerageName: isBroker ? brokerageName : "",
          brokerageStreet: isBroker ? brokerageStreet : "",
          brokerageCity: isBroker ? brokerageCity : "",
          brokerageState: isBroker ? brokerageState : "",
          brokerageCountry: isBroker ? brokerageCountry : "",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401 || data?.error === "AUTH_REQUIRED") {
        window.location.assign(`/login?next=${encodeURIComponent("/dashboard/account")}`);
        return;
      }

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Save failed.");
      }

      // ✅ API returns { profile: {...} }
      setProfile(data.profile);
      setOkMsg("Saved.");

      // ✅ refresh /api/auth/me contract consumers (NewListingForm autofill)
      try {
        await fetch("/api/auth/me", { cache: "no-store" });
      } catch {}
    } catch (e) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPwSaving(true);
    setErr("");
    setOkMsg("");

    try {
      if (!currentPassword || !newPassword) {
        throw new Error("Enter current password and a new password.");
      }
      if (newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters.");
      }
      if (newPassword !== confirmNew) {
        throw new Error("New passwords do not match.");
      }

      const res = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401 || data?.error === "AUTH_REQUIRED") {
        window.location.assign(`/login?next=${encodeURIComponent("/dashboard/account")}`);
        return;
      }

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Password update failed.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNew("");
      setOkMsg("Password updated.");
    } catch (e) {
      setErr(e?.message || "Password update failed.");
    } finally {
      setPwSaving(false);
    }
  }

  async function resendVerification() {
    setErr("");
    setOkMsg("");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data?.error || "Could not resend verification email.");
      setOkMsg(data.alreadyVerified ? "You’re already verified." : "Verification email sent. Check inbox/spam.");
    } catch (e) {
      setErr(e?.message || "Could not resend verification email.");
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteErr("");
    setErr("");
    setOkMsg("");

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

  const headerRight = useMemo(() => {
    if (!profile) return null;
    return (
      <div className="text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Email status:</span>
          {emailVerified ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
              Verified
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
              Not verified
            </span>
          )}
        </div>
      </div>
    );
  }, [profile, emailVerified]);

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0a2230]">Account</h1>
            <p className="mt-1 text-sm text-slate-600">
              Keep this accurate — it pre-fills your listing contact details.
            </p>
          </div>
          {headerRight}
        </div>

        {err ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        {okMsg ? (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {okMsg}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm text-sm text-slate-600">
            Loading…
          </div>
        ) : (
          <div className="grid gap-6">
            {!emailVerified ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                <div className="font-semibold">Verify your email</div>
                <div className="mt-1 text-amber-900/80">
                  You must verify your email to post listings.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resendVerification}
                    className="h-10 rounded-full px-4 text-sm font-semibold text-white"
                    style={{ background: NAVY }}
                  >
                    Resend verification email
                  </button>
                  <Link
                    href="/dashboard"
                    className="h-10 rounded-full px-4 text-sm font-semibold border border-slate-300 bg-white text-[#0a2230] inline-flex items-center"
                  >
                    Go to dashboard
                  </Link>
                </div>
              </div>
            ) : null}

            <Card title="Profile" subtitle="This info is used to auto-fill listing contact details.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelBase}>First name</label>
                  <input className={inputBase} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>

                <div>
                  <label className={labelBase}>Last name</label>
                  <input className={inputBase} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>

                {/* Email is read-only here (email change is a separate secured flow) */}
                <div className="sm:col-span-2">
                  <label className={labelBase}>Email (read-only)</label>
                  <input className={`${inputBase} bg-slate-50`} value={profile?.email || ""} readOnly />
                  <div className="mt-2 text-xs text-slate-600">
                    To change email safely, we’ll add a dedicated “Change email” flow next.
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelBase}>Phone (E.164)</label>
                  <input
                    className={inputBase}
                    value={phoneE164}
                    onChange={(e) => setPhoneE164(e.target.value)}
                    placeholder="+14155552671"
                  />
                  <div className="mt-2 text-xs text-slate-600">
                    International format: <span className="font-semibold">+{`countrycode`}{`number`}</span>. Leave blank to clear.
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelBase}>Seller role</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSellerRole("OWNER")}
                      className={`h-10 rounded-full px-4 text-sm font-semibold border transition ${
                        sellerRole === "OWNER"
                          ? "bg-[#0a2230] text-white border-[#0a2230]"
                          : "bg-white text-[#0a2230] border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellerRole("BROKER")}
                      className={`h-10 rounded-full px-4 text-sm font-semibold border transition ${
                        sellerRole === "BROKER"
                          ? "bg-[#0a2230] text-white border-[#0a2230]"
                          : "bg-white text-[#0a2230] border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      Broker
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelBase}>Business name (optional)</label>
                  <input className={inputBase} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
              </div>

              {isBroker ? (
                <div className="mt-6 rounded-2xl border bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-[#0a2230]">Broker details</div>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={labelBase}>Brokerage name</label>
                      <input className={inputBase} value={brokerageName} onChange={(e) => setBrokerageName(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelBase}>Street</label>
                      <input className={inputBase} value={brokerageStreet} onChange={(e) => setBrokerageStreet(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelBase}>City</label>
                      <input className={inputBase} value={brokerageCity} onChange={(e) => setBrokerageCity(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelBase}>State/Region</label>
                      <input className={inputBase} value={brokerageState} onChange={(e) => setBrokerageState(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelBase}>Country</label>
                      <input className={inputBase} value={brokerageCountry} onChange={(e) => setBrokerageCountry(e.target.value)} />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" disabled={saving} onClick={saveProfile} className={btnPrimary} style={{ background: GOLD }}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <Link href="/dashboard" className={btnGhost}>
                  Back to dashboard
                </Link>
              </div>
            </Card>

            <Card title="Security" subtitle="Change your password.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelBase}>Current password</label>
                  <input
                    className={inputBase}
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                <div>
                  <label className={labelBase}>New password</label>
                  <input
                    className={inputBase}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className={labelBase}>Confirm new password</label>
                  <input
                    className={inputBase}
                    type="password"
                    value={confirmNew}
                    onChange={(e) => setConfirmNew(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  disabled={pwSaving}
                  onClick={changePassword}
                  className={btnPrimary}
                  style={{ background: NAVY, color: "white" }}
                >
                  {pwSaving ? "Updating…" : "Update password"}
                </button>
              </div>
            </Card>

            {/* ✅ RESTORED: Delete account section (matches old behavior) */}
            <Card
              title="Danger zone"
              subtitle="Permanently delete your account and your listings. This cannot be undone."
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  If you no longer want an account, you can permanently delete it.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteErr("");
                    setOpenDelete(true);
                  }}
                  className="h-10 rounded-full px-5 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: "#dc2626" }}
                >
                  Delete account
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ✅ Confirm delete modal (same as old) */}
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
    </main>
  );
}
