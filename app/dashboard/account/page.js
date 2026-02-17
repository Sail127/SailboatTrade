// app/dashboard/account/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notifyAuthChanged } from "@/lib/auth-client";

/** ✅ Match Registration phone UI */
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { parsePhoneNumberFromString } from "libphonenumber-js";

/** ✅ ISO countries (shared with registration) */
import { getCountryOptions } from "@/lib/countries";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

const labelBase = "mb-2 block text-sm font-semibold text-[#0a2230]";
const inputBase =
  "h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40 bg-white";
const selectBase =
  "h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40 bg-white";

const btnPrimary =
  "inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-black disabled:opacity-60";
const btnGhost =
  "inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold border border-slate-300 text-[#0a2230] hover:bg-slate-50";

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

function Card({ title, subtitle, children, right }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0a2230]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {right ? <div>{right}</div> : null}
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

function normalizePhoneToE164(raw) {
  const s = String(raw || "").trim();
  if (!s) return { e164: "", ok: true }; // empty clears
  const pn = parsePhoneNumberFromString(s);
  if (!pn) return { e164: "", ok: false };
  if (!pn.isValid()) return { e164: "", ok: false };
  return { e164: pn.number, ok: true };
}

function guessDefaultCountry() {
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

export default function AccountPage() {
  const [loading, setLoading] = useState(true);

  // Profile save
  const [saving, setSaving] = useState(false);
  const [profileErr, setProfileErr] = useState("");
  const [profileOk, setProfileOk] = useState("");

  // Password save
  const [pwSaving, setPwSaving] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [pwOk, setPwOk] = useState("");

  const [profile, setProfile] = useState(null);

  // ✅ ISO country options (same as register)
  const COUNTRY_OPTIONS = useMemo(() => getCountryOptions("en"), []);

  // editable profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // ✅ phone matches registration UI
  const [phoneRaw, setPhoneRaw] = useState("");
  const [phoneMsg, setPhoneMsg] = useState("");

  const [sellerRole, setSellerRole] = useState("OWNER");

  // broker fields
  const [brokerageName, setBrokerageName] = useState("");
  const [brokerageStreet, setBrokerageStreet] = useState("");
  const [brokerageCity, setBrokerageCity] = useState("");
  const [brokerageState, setBrokerageState] = useState("");
  const [brokerageCountry, setBrokerageCountry] = useState("");

  // ✅ Homeport fields (Option B)
  const [homeportCountry, setHomeportCountry] = useState("");
  const [homeportRegion, setHomeportRegion] = useState("");
  const [homeportState, setHomeportState] = useState("");
  const [homeportAdmin1, setHomeportAdmin1] = useState("");
  const [homeportCity, setHomeportCity] = useState("");

  // password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [showPw, setShowPw] = useState(false);

  // delete modal
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  const emailVerified = Boolean(profile?.emailVerified);
  const isBroker = sellerRole === "BROKER";
  const isUSA = homeportCountry === "US";
  const isBrokerUSA = brokerageCountry === "US";

  // PhoneInput default country (best-effort)
  const [defaultCountry, setDefaultCountry] = useState("us");
  useEffect(() => {
    setDefaultCountry(guessDefaultCountry());
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setProfileErr("");
      setProfileOk("");
      setPwErr("");
      setPwOk("");

      try {
        const res = await fetch("/api/account/profile", { cache: "no-store", credentials: "include" });
        const data = await res.json().catch(() => ({}));

        if (!alive) return;

        if (res.status === 401 || data?.error === "AUTH_REQUIRED") {
          window.location.assign(`/login?next=${encodeURIComponent("/dashboard/account")}`);
          return;
        }

        if (!res.ok || !data.ok) {
          throw new Error(data?.error || "Could not load account details.");
        }

        const u = data.profile;
        setProfile(u);

        setFirstName(u.firstName || "");
        setLastName(u.lastName || "");

        setSellerRole(u.sellerRole || "OWNER");
        setPhoneRaw(u.phoneE164 || "");

        setBrokerageName(u.brokerageName || "");
        setBrokerageStreet(u.brokerageStreet || "");
        setBrokerageCity(u.brokerageCity || "");
        setBrokerageState(u.brokerageState || "");
        setBrokerageCountry(u.brokerageCountry || "");

        setHomeportCountry(u.homeportCountry || "");
        setHomeportRegion(u.homeportRegion || "");
        setHomeportState(u.homeportState || "");
        setHomeportAdmin1(u.homeportAdmin1 || "");
        setHomeportCity(u.homeportCity || "");

        // If profile has a homeport country, prefer it for the phone selector default
        if (u?.homeportCountry) {
          const cc = String(u.homeportCountry).toLowerCase();
          if (cc.length === 2) setDefaultCountry(cc);
        }
      } catch (e) {
        if (!alive) return;
        setProfileErr(e?.message || "Could not load account details.");
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
    setProfileErr("");
    setProfileOk("");
    setPwErr("");
    setPwOk("");
    setPhoneMsg("");

    try {
      const { e164, ok } = normalizePhoneToE164(phoneRaw);
      if (!ok) {
        setPhoneMsg("Please enter a valid phone number (include country code).");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName,
          lastName,
          phoneE164: e164, // ✅ E.164 string or "" to clear

          sellerRole,

          // ✅ Brokerage (ISO dropdown + US-only state)
          brokerageName: isBroker ? brokerageName : "",
          brokerageStreet: isBroker ? brokerageStreet : "",
          brokerageCity: isBroker ? brokerageCity : "",
          brokerageCountry: isBroker ? (brokerageCountry || "") : "",
          brokerageState: isBroker && isBrokerUSA ? brokerageState : "",

          // ✅ Homeport Option B
          homeportCountry: homeportCountry || "",
          homeportRegion: isUSA ? homeportRegion : "",
          homeportState: isUSA ? homeportState : "",
          homeportAdmin1: !isUSA ? homeportAdmin1 : "",
          homeportCity: homeportCity,
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

      setProfile(data.profile);
      setProfileOk("Saved.");

      // refresh /api/auth/me contract consumers (listing form autofill)
      try {
        await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      } catch {}
    } catch (e) {
      setProfileErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function resendVerification() {
    setProfileErr("");
    setProfileOk("");
    setPwErr("");
    setPwOk("");

    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data?.error || "Could not resend verification email.");
      setProfileOk(data.alreadyVerified ? "You’re already verified." : "Verification email sent. Check inbox/spam.");
    } catch (e) {
      setProfileErr(e?.message || "Could not resend verification email.");
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

      // ✅ Show success + force logout for security
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNew("");

      setPwOk("Password updated. Redirecting to login…");

      // ✅ Update SPA header right away (avatar/menu)
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
    setProfileErr("");
    setProfileOk("");
    setPwErr("");
    setPwOk("");

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

        {profileErr ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {profileErr}
          </div>
        ) : null}

        {profileOk ? (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {profileOk}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm text-sm text-slate-600">Loading…</div>
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

              {/* Email read-only */}
              <div className={`mt-4 ${fieldWrap}`}>
                <label className={labelBase}>Email (read-only)</label>
                <input className={`${inputBase} bg-slate-50`} value={profile?.email || ""} readOnly />
                <div className="mt-2 text-xs text-slate-600">
                  To change email safely, we’ll add a dedicated “Change email” flow next.
                </div>
              </div>

              {/* Phone */}
              <div className={`mt-4 ${fieldWrap}`}>
                <label className={labelBase}>
                  Phone number <span className="font-normal text-slate-500">(optional)</span>
                </label>

                <div className="rounded-xl border px-3 py-2 focus-within:ring-2 focus-within:ring-[#c8a44d]/40 bg-white">
                  <PhoneInput
                    defaultCountry={defaultCountry}
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
                <div className="mt-2 text-xs text-slate-600">
                  Include country code. We store phone numbers in international format so they display correctly worldwide.
                </div>
              </div>

              {/* Seller Role */}
              <div className={`mt-5 ${fieldWrap}`}>
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

              {/* Homeport (Option B) */}
              <div className="mt-6 rounded-2xl border bg-slate-50 p-4">
                <div className="text-sm font-semibold text-[#0a2230]">Homeport Location</div>
                <div className="mt-1 text-xs text-slate-600">
                  Providing your homeport helps prioritize the most relevant listings to you.
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

                        // ✅ enforce Option B behavior
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
                        <label className={labelBase}>Region</label>
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
                            autoComplete="address-level1"
                          />
                        </div>

                        <div className={fieldWrapSm}>
                          <label className={labelBase}>City</label>
                          <input
                            className={inputBase}
                            value={homeportCity}
                            onChange={(e) => setHomeportCity(e.target.value)}
                            autoComplete="address-level2"
                          />
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
                          autoComplete="address-level1"
                        />
                      </div>

                      <div className={fieldWrapSm}>
                        <label className={labelBase}>City</label>
                        <input
                          className={inputBase}
                          value={homeportCity}
                          onChange={(e) => setHomeportCity(e.target.value)}
                          autoComplete="address-level2"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Broker details (only if BROKER) */}
              {isBroker ? (
                <div className="mt-6 rounded-2xl border bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-[#0a2230]">Broker details</div>

                  <div className="mt-4 space-y-4">
                    <div className={fieldWrap}>
                      <label className={labelBase}>Brokerage name</label>
                      <input className={inputBase} value={brokerageName} onChange={(e) => setBrokerageName(e.target.value)} />
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className={fieldWrapSm}>
                        <label className={labelBase}>Street</label>
                        <input className={inputBase} value={brokerageStreet} onChange={(e) => setBrokerageStreet(e.target.value)} />
                      </div>

                      <div className={fieldWrapSm}>
                        <label className={labelBase}>City</label>
                        <input className={inputBase} value={brokerageCity} onChange={(e) => setBrokerageCity(e.target.value)} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className={fieldWrapSm}>
                        <label className={labelBase}>Country</label>
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
                          <input
                            className={inputBase}
                            value={brokerageState}
                            onChange={(e) => setBrokerageState(e.target.value)}
                            autoComplete="address-level1"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveProfile}
                  className={btnPrimary}
                  style={{ background: GOLD }}
                >
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
                    type={showPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>

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
                  <div className="mt-2 text-xs text-slate-600">Minimum 8 characters.</div>
                </div>

                <div>
                  <label className={labelBase}>Confirm new password</label>
                  <input
                    className={inputBase}
                    type={showPw ? "text" : "password"}
                    value={confirmNew}
                    onChange={(e) => setConfirmNew(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Type it again"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPw} />
                  {showPw ? "Hide" : "Show"}
                </button>

                <div className="flex items-center gap-3">
                  {pwErr ? (
                    <div className="text-sm font-semibold text-red-600">{pwErr}</div>
                  ) : pwOk ? (
                    <div className="text-sm font-semibold text-emerald-700">{pwOk}</div>
                  ) : null}

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
              </div>
            </Card>

            <Card title="Danger zone" subtitle="Permanently delete your account and your listings. This cannot be undone.">
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
      </div>
    </main>
  );
}
