// app/dashboard/account/ui.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { notifyAuthChanged } from "@/lib/auth-client";

// ✅ shared ISO country list
import { getCountryOptions } from "@/lib/countries";

// ✅ phone input (same as register)
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

const inputBase =
  "h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40 bg-white";
const selectBase =
  "h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40 bg-white";
const labelBase = "mb-2 block text-sm font-semibold text-[#0a2230]";

const fieldWrap = "w-full max-w-[560px]";
const fieldWrapSm = "w-full max-w-[360px]";

const US_REGION_OPTIONS = [
  { label: "Select…", value: "" },
  { label: "West Coast", value: "WEST_COAST" },
  { label: "East Coast", value: "EAST_COAST" },
  { label: "Gulf Coast", value: "GULF_COAST" },
  { label: "Great Lakes", value: "GREAT_LAKES" },
  { label: "Hawaii", value: "HAWAII" },
  { label: "Other Inland waters", value: "OTHER_INLAND_WATERS" },
  { label: "Other U.S. Territorial waters", value: "OTHER_US_TERRITORIAL" },
];

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString();
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
      <path d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
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

function normalizePhoneToE164(raw) {
  const s = String(raw || "").trim();
  if (!s) return { e164: null, ok: true };
  const pn = parsePhoneNumberFromString(s);
  if (!pn) return { e164: null, ok: false };
  if (!pn.isValid()) return { e164: null, ok: false };
  return { e164: pn.number, ok: true };
}

function guessPhoneDefaultCountry() {
  try {
    const lang = (navigator.language || "").toLowerCase();
    if (lang.includes("en-gb")) return "gb";
    if (lang.includes("en-au")) return "au";
    if (lang.includes("en-nz")) return "nz";
    if (lang.includes("fr")) return "fr";
    if (lang.includes("es")) return "es";
    if (lang.includes("it")) return "it";
    if (lang.includes("nl")) return "nl";
    if (lang.includes("sv")) return "se";
    if (lang.includes("pt")) return "pt";
    if (lang.includes("el")) return "gr";
    if (lang.includes("hr")) return "hr";
    if (lang.includes("en-ca") || lang.includes("fr-ca")) return "ca";
    return "us";
  } catch {
    return "us";
  }
}

export default function AccountUI({ user }) {
  const verified = Boolean(user?.emailVerifiedAt);

  const displayName = useMemo(() => {
    const fn = (user?.firstName || "").trim();
    const ln = (user?.lastName || "").trim();
    if (fn || ln) return `${fn} ${ln}`.trim();
    return (user?.name || "").trim();
  }, [user]);

  const COUNTRY_OPTIONS = useMemo(() => getCountryOptions("en"), []);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // --- profile state (loaded from /api/account/profile)
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErr, setProfileErr] = useState("");
  const [profileOk, setProfileOk] = useState("");

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [sellerRole, setSellerRole] = useState(user?.sellerRole || "OWNER");

  // Phone input uses raw UI value; we’ll normalize to E164 on save
  const [phoneRaw, setPhoneRaw] = useState(user?.phoneE164 || "");
  const [phoneMsg, setPhoneMsg] = useState("");

  // Brokerage
  const [brokerageName, setBrokerageName] = useState("");
  const [brokerageStreet, setBrokerageStreet] = useState("");
  const [brokerageCity, setBrokerageCity] = useState("");
  const [brokerageCountry, setBrokerageCountry] = useState("");
  const [brokerageState, setBrokerageState] = useState("");

  const isBroker = sellerRole === "BROKER";
  const isBrokerUSA = brokerageCountry === "US";

  // Homeport (Option B)
  const [homeportCountry, setHomeportCountry] = useState("");
  const [homeportRegion, setHomeportRegion] = useState("");
  const [homeportState, setHomeportState] = useState("");
  const [homeportAdmin1, setHomeportAdmin1] = useState("");
  const [homeportCity, setHomeportCity] = useState("");

  const isUSA = homeportCountry === "US";

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [pwSaving, setPwSaving] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [pwOk, setPwOk] = useState("");

  // Delete modal + action
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  const [defaultPhoneCountry, setDefaultPhoneCountry] = useState("us");
  useEffect(() => setDefaultPhoneCountry(guessPhoneDefaultCountry()), []);

  async function loadProfile() {
    setLoadingProfile(true);
    setProfileErr("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { "cache-control": "no-store" },
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401 || data?.error === "AUTH_REQUIRED") {
        window.location.assign(`/login?next=${encodeURIComponent("/dashboard/account")}`);
        return;
      }
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load profile.");
      }

      const p = data.profile || {};

      setFirstName(p.firstName || "");
      setLastName(p.lastName || "");
      setSellerRole(p.sellerRole || "OWNER");

      setPhoneRaw(p.phoneE164 || "");
      setPhoneMsg("");

      setBrokerageName(p.brokerageName || "");
      setBrokerageStreet(p.brokerageStreet || "");
      setBrokerageCity(p.brokerageCity || "");
      setBrokerageState(p.brokerageState || "");
      setBrokerageCountry(p.brokerageCountry || "");

      setHomeportCountry(p.homeportCountry || "");
      setHomeportRegion(p.homeportRegion || "");
      setHomeportState(p.homeportState || "");
      setHomeportAdmin1(p.homeportAdmin1 || "");
      setHomeportCity(p.homeportCity || "");
    } catch (e) {
      setProfileErr(e?.message || "Failed to load profile.");
    } finally {
      setLoadingProfile(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileErr("");
    setProfileOk("");
    setNotice("");
    setError("");
    setPhoneMsg("");

    try {
      const fn = firstName.trim();
      const ln = lastName.trim();

      // phone normalize
      const { e164, ok } = normalizePhoneToE164(phoneRaw);
      if (!ok) {
        setPhoneMsg("Please enter a valid phone number (include country code).");
        setSavingProfile(false);
        return;
      }

      // enforce homeport fields per Option B
      const payload = {
        firstName: fn || null,
        lastName: ln || null,
        sellerRole,

        phoneE164: e164,

        brokerageName: isBroker ? (brokerageName.trim() || null) : null,
        brokerageStreet: isBroker ? (brokerageStreet.trim() || null) : null,
        brokerageCity: isBroker ? (brokerageCity.trim() || null) : null,
        brokerageCountry: isBroker ? (brokerageCountry || null) : null,
        brokerageState: isBroker && isBrokerUSA ? (brokerageState.trim() || null) : null,

        homeportCountry: homeportCountry || null,
        homeportRegion: isUSA ? (homeportRegion || null) : null,
        homeportState: isUSA ? (homeportState.trim() || null) : null,
        homeportAdmin1: !isUSA ? (homeportAdmin1.trim() || null) : null,
        homeportCity: homeportCity.trim() || null,
      };

      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401 || data?.error === "AUTH_REQUIRED") {
        window.location.assign(`/login?next=${encodeURIComponent("/dashboard/account")}`);
        return;
      }

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Profile update failed.");
      }

      setProfileOk("Profile updated.");
    } catch (e) {
      setProfileErr(e?.message || "Profile update failed.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    setPwSaving(true);
    setPwErr("");
    setPwOk("");
    setProfileErr("");
    setProfileOk("");

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
        credentials: "include",
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

      // ✅ show success, then force logout (matches your API's forceLogout intent)
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNew("");
      setPwOk(data?.message || "Password updated. Please log in again.");

      // notify header + hard redirect to login
      try {
        notifyAuthChanged();
      } catch {}

      setTimeout(() => {
        window.location.assign(`/login?next=${encodeURIComponent("/dashboard/account")}`);
      }, 900);
    } catch (e) {
      setPwErr(e?.message || "Password update failed.");
    } finally {
      setPwSaving(false);
    }
  }

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

      try {
        notifyAuthChanged();
      } catch {}

      window.location.href = "/";
    } catch (e) {
      setDeleteErr(e?.message || "Failed to delete account.");
      setDeleting(false);
    }
  }

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Account overview */}
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
                    <span className="ml-2 text-xs text-slate-500">({fmtDate(user.emailVerifiedAt)})</span>
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
        </div>

        {/* Profile */}
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-[#0a2230]">Profile</div>
              <div className="mt-1 text-sm text-slate-600">
                This information helps pre-fill your listing contact details.
              </div>
            </div>

            <button
              type="button"
              onClick={loadProfile}
              disabled={loadingProfile}
              className="h-10 rounded-full border px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingProfile ? "Loading…" : "Refresh"}
            </button>
          </div>

          {profileOk ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {profileOk}
            </div>
          ) : null}

          {profileErr ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileErr}
            </div>
          ) : null}

          <div className="mt-5 space-y-5">
            {/* Role */}
            <div className={fieldWrap}>
              <label className={labelBase}>Are you an owner or broker?</label>
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

            {/* Name */}
            <div className="flex flex-wrap gap-4">
              <div className={fieldWrapSm}>
                <label className={labelBase}>First name</label>
                <input className={inputBase} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className={fieldWrapSm}>
                <label className={labelBase}>Last name</label>
                <input className={inputBase} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            {/* Phone (same look as register) */}
            <div className={fieldWrap}>
              <label className={labelBase}>Phone number</label>
              <div className="rounded-xl border px-3 py-2 focus-within:ring-2 focus-within:ring-[#c8a44d]/40 bg-white">
                <PhoneInput
                  defaultCountry={defaultPhoneCountry}
                  value={phoneRaw}
                  onChange={(v) => {
                    setPhoneRaw(v);
                    setPhoneMsg("");
                  }}
                  inputClassName="w-full !border-0 !shadow-none !outline-none !text-sm"
                  countrySelectorStyleProps={{ buttonClassName: "!border-0 !shadow-none" }}
                />
              </div>
              {phoneMsg ? <div className="mt-2 text-xs font-semibold text-red-600">{phoneMsg}</div> : null}
              <div className="mt-2 text-xs text-slate-600">We store your number in international format (E.164).</div>
            </div>

            {/* Homeport (Option B) */}
            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="text-sm font-semibold text-[#0a2230]">Homeport</div>
              <div className="mt-1 text-xs text-slate-600">
                Used for future auto-fill and location-aware features.
              </div>

              <div className="mt-4 space-y-4">
                <div className={fieldWrapSm}>
                  <label className={labelBase}>Country</label>
                  <select
                    className={selectBase}
                    value={homeportCountry}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHomeportCountry(v);

                      // ✅ enforce Option B switch
                      if (v === "US") {
                        setHomeportAdmin1("");
                      } else {
                        setHomeportRegion("");
                        setHomeportState("");
                      }
                    }}
                  >
                    {COUNTRY_OPTIONS.map((o) => (
                      <option key={o.value || "blank"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {isUSA ? (
                  <>
                    <div className={fieldWrapSm}>
                      <label className={labelBase}>U.S. Region</label>
                      <select
                        className={selectBase}
                        value={homeportRegion}
                        onChange={(e) => setHomeportRegion(e.target.value)}
                      >
                        {US_REGION_OPTIONS.map((o) => (
                          <option key={o.value || "blank"} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className={fieldWrapSm}>
                        <label className={labelBase}>State</label>
                        <input
                          className={inputBase}
                          value={homeportState}
                          onChange={(e) => setHomeportState(e.target.value)}
                          placeholder="ex: FL"
                        />
                      </div>

                      <div className={fieldWrapSm}>
                        <label className={labelBase}>City</label>
                        <input className={inputBase} value={homeportCity} onChange={(e) => setHomeportCity(e.target.value)} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    <div className={fieldWrapSm}>
                      <label className={labelBase}>Province/Region</label>
                      <input
                        className={inputBase}
                        value={homeportAdmin1}
                        onChange={(e) => setHomeportAdmin1(e.target.value)}
                        placeholder="ex: Ontario / Andalucía / New South Wales"
                      />
                    </div>
                    <div className={fieldWrapSm}>
                      <label className={labelBase}>City</label>
                      <input className={inputBase} value={homeportCity} onChange={(e) => setHomeportCity(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Broker fields */}
            {isBroker ? (
              <div className="space-y-3 rounded-2xl border bg-slate-50 p-4">
                <div className="text-sm font-semibold text-[#0a2230]">Broker details (optional)</div>

                <div className={fieldWrap}>
                  <label className={labelBase}>Brokerage name</label>
                  <input className={inputBase} value={brokerageName} onChange={(e) => setBrokerageName(e.target.value)} />
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className={fieldWrapSm}>
                    <label className={labelBase}>Street (optional)</label>
                    <input className={inputBase} value={brokerageStreet} onChange={(e) => setBrokerageStreet(e.target.value)} />
                  </div>
                  <div className={fieldWrapSm}>
                    <label className={labelBase}>City (optional)</label>
                    <input className={inputBase} value={brokerageCity} onChange={(e) => setBrokerageCity(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className={fieldWrapSm}>
                    <label className={labelBase}>Country (optional)</label>
                    <select
                      className={selectBase}
                      value={brokerageCountry}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBrokerageCountry(v);
                        if (v !== "US") setBrokerageState("");
                      }}
                    >
                      {COUNTRY_OPTIONS.map((o) => (
                        <option key={o.value || "blank"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isBrokerUSA ? (
                    <div className={fieldWrapSm}>
                      <label className={labelBase}>State (optional)</label>
                      <input className={inputBase} value={brokerageState} onChange={(e) => setBrokerageState(e.target.value)} />
                    </div>
                  ) : null}
                </div>

                <div className="text-xs text-slate-600">
                  These details can be used later to pre-fill broker contact info on your listings.
                </div>
              </div>
            ) : null}

            {/* Save profile */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveProfile}
                disabled={savingProfile || loadingProfile}
                className="h-11 rounded-xl px-6 font-semibold disabled:opacity-60"
                style={{ background: GOLD, color: "black" }}
              >
                {savingProfile ? "Saving…" : "Save profile"}
              </button>

              <div className="text-xs text-slate-500">
                Changes save to your account profile.
              </div>
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-[#0a2230]">Password</div>
          <div className="mt-1 text-sm text-slate-600">Update your password. You will be logged out after success.</div>

          {/* ✅ error/success appears beside the button (like you asked earlier) */}
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[260px]">
              <label className={labelBase}>Current password</label>
              <input
                className={inputBase}
                type={showPw ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="h-11 inline-flex items-center gap-2 rounded-xl border px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              <EyeIcon open={showPw} />
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelBase}>New password</label>
              <input
                className={inputBase}
                type={showPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="8+ characters"
              />
            </div>

            <div>
              <label className={labelBase}>Confirm new password</label>
              <input
                className={inputBase}
                type={showPw ? "text" : "password"}
                value={confirmNew}
                onChange={(e) => setConfirmNew(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={changePassword}
              disabled={pwSaving}
              className="h-11 rounded-xl px-6 font-semibold disabled:opacity-60"
              style={{ background: NAVY, color: "white" }}
            >
              {pwSaving ? "Updating…" : "Change password"}
            </button>

            {pwErr ? <div className="text-sm font-semibold text-red-600">{pwErr}</div> : null}
            {pwOk ? <div className="text-sm font-semibold text-emerald-700">{pwOk}</div> : null}
          </div>

          <div className="mt-2 text-xs text-slate-500">Tip: use a strong password you don’t reuse elsewhere.</div>
        </div>

        {/* Delete */}
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[#0a2230]">Delete account</div>
              <div className="mt-1 text-xs text-slate-500">This permanently deletes your account and listings.</div>
            </div>
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
        <Modal open={openDelete} title="Delete your account?" onClose={() => (deleting ? null : setOpenDelete(false))}>
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

        {/* Support */}
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-[#0a2230]">Support</div>
          <div className="mt-2 text-sm text-slate-600">If you need help, contact support and we’ll take care of you.</div>
        </div>
      </div>
    </div>
  );
}
