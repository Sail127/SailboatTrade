// app/register/page.js
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useMemo, useEffect } from "react";
import Link from "next/link";

/**
 * ✅ International phone input:
 *   npm i react-international-phone libphonenumber-js
 */
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

import { parsePhoneNumberFromString } from "libphonenumber-js";

// ✅ Option 1 country list (ISO, shared)
import { getCountryOptions } from "@/lib/countries";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

const inputBase =
  "h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40 bg-white";
const selectBase =
  "h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40 bg-white";
const labelBase = "mb-2 block text-sm font-semibold text-[#0a2230]";

// keep fields from getting comically wide on huge monitors
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

function RegisterInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const next = useMemo(() => sp.get("next") || "/dashboard", [sp]);

  // ✅ shared countries list (ISO codes)
  const COUNTRY_OPTIONS = useMemo(() => getCountryOptions("en"), []);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Seller role
  const [sellerRole, setSellerRole] = useState("OWNER"); // OWNER | BROKER

  // Broker fields
  const [brokerageName, setBrokerageName] = useState("");
  const [brokerageStreet, setBrokerageStreet] = useState("");
  const [brokerageCity, setBrokerageCity] = useState("");
  const [brokerageState, setBrokerageState] = useState("");
  const [brokerageCountry, setBrokerageCountry] = useState("");

  const isBrokerUSA = brokerageCountry === "US";

  // Phone
  const [phoneRaw, setPhoneRaw] = useState("");
  const [phoneMsg, setPhoneMsg] = useState("");

  // ✅ Homeport
  const [homeportCountry, setHomeportCountry] = useState("");
  const [homeportRegion, setHomeportRegion] = useState("");
  const [homeportState, setHomeportState] = useState(""); // US: state; Non-US: region/province text
  const [homeportCity, setHomeportCity] = useState("");

  const isUSA = homeportCountry === "US";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  // Try to default country in PhoneInput from browser locale (best-effort)
  const [defaultCountry, setDefaultCountry] = useState("us");
  useEffect(() => {
    try {
      const lang = (navigator.language || "").toLowerCase();
      if (lang.includes("en-gb")) setDefaultCountry("gb");
      else if (lang.includes("en-au")) setDefaultCountry("au");
      else if (lang.includes("en-nz")) setDefaultCountry("nz");
      else if (lang.includes("fr")) setDefaultCountry("fr");
      else if (lang.includes("es")) setDefaultCountry("es");
      else if (lang.includes("it")) setDefaultCountry("it");
      else if (lang.includes("nl")) setDefaultCountry("nl");
      else if (lang.includes("sv")) setDefaultCountry("se");
      else if (lang.includes("pt")) setDefaultCountry("pt");
      else if (lang.includes("el")) setDefaultCountry("gr");
      else if (lang.includes("hr")) setDefaultCountry("hr");
      else if (lang.includes("en-ca") || lang.includes("fr-ca")) setDefaultCountry("ca");
      else setDefaultCountry("us");
    } catch {}
  }, []);

  function normalizePhoneToE164(raw) {
    const s = String(raw || "").trim();
    if (!s) return { e164: null, ok: true }; // optional
    const pn = parsePhoneNumberFromString(s);
    if (!pn) return { e164: null, ok: false };
    if (!pn.isValid()) return { e164: null, ok: false };
    return { e164: pn.number, ok: true };
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;

    setErr("");
    setSuccess("");
    setPhoneMsg("");

    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim().toLowerCase();

    if (!fn || !ln) return setErr("First and last name are required.");
    if (!em || !em.includes("@")) return setErr("Please enter a valid email.");
    if (!password || password.length < 8) return setErr("Password must be at least 8 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");

    const { e164, ok } = normalizePhoneToE164(phoneRaw);
    if (!ok) {
      setPhoneMsg("Please enter a valid phone number (include country code).");
      return;
    }

    if (sellerRole === "BROKER" && !brokerageName.trim()) {
      return setErr("Brokerage name is recommended for brokers.");
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: fn,
          lastName: ln,
          email: em,
          password,

          sellerRole,

          // ✅ align with api/auth/register + prisma
          phoneE164: e164,

          brokerageName: sellerRole === "BROKER" ? brokerageName.trim() || null : null,
          brokerageStreet: sellerRole === "BROKER" ? brokerageStreet.trim() || null : null,
          brokerageCity: sellerRole === "BROKER" ? brokerageCity.trim() || null : null,
          brokerageCountry: sellerRole === "BROKER" ? (brokerageCountry || null) : null,
          brokerageState:
            sellerRole === "BROKER" && isBrokerUSA ? brokerageState.trim() || null : null,

          // ✅ Homeport
          homeportCountry: homeportCountry || null,
          homeportRegion: isUSA ? homeportRegion || null : null,
          // Store US state OR non-US "region/province" in the same field for now
          homeportState: homeportState.trim() || null,
          homeportCity: homeportCity.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Register failed.");
      }

      const verificationSent = data?.emailVerificationSent !== false;

      setSuccess(
        verificationSent
          ? "Account created successfully. Please check your inbox to verify your email. Redirecting…"
          : "Account created, but we could not send your verification email yet. Redirecting to your account so you can resend it."
      );

      setTimeout(() => {
        router.replace(verificationSent ? next : "/dashboard/account");
        router.refresh();
      }, verificationSent ? 900 : 1400);
    } catch (e2) {
      setErr(e2?.message || "Register failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-14">
        <div className="mx-auto w-full max-w-4xl">
          <div className="grid gap-8 md:grid-cols-5">
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

                <div className="mt-5 text-xs text-slate-500">
                  Providing your <span className="font-semibold">Homeport</span> helps us prioritize the most relevant listings to you.
                </div>
              </div>
            </div>

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

                <form onSubmit={onSubmit} className="mt-5 space-y-5">
                  {/* Role */}
                  <div className={fieldWrap}>
                    <label className={labelBase}>
                      Are you an owner or broker? <span className="text-red-500">*</span>
                    </label>
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
                    <div className="mt-2 text-xs text-slate-600">
                      This helps pre-fill your Listing Contact section when you create a listing.
                    </div>
                  </div>

                  {/* Name */}
                  <div className="flex flex-wrap gap-4">
                    <div className={fieldWrapSm}>
                      <label className={labelBase}>
                        First name <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={inputBase}
                        placeholder="First"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                      />
                    </div>

                    <div className={fieldWrapSm}>
                      <label className={labelBase}>
                        Last name <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={inputBase}
                        placeholder="Last"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className={fieldWrap}>
                    <label className={labelBase}>
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={inputBase}
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>

                  {/* Phone */}
                  <div className={fieldWrap}>
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
                        countrySelectorStyleProps={{
                          buttonClassName: "!border-0 !shadow-none",
                        }}
                      />
                    </div>

                    {phoneMsg ? (
                      <div className="mt-2 text-xs font-semibold text-red-600">{phoneMsg}</div>
                    ) : null}
                    <div className="mt-2 text-xs text-slate-600">
                      Include country code. We store phone numbers in international format so they display correctly worldwide.
                    </div>
                  </div>

                  {/* Homeport */}
                  <div className="rounded-2xl border bg-slate-50 p-4">
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
                            if (v !== "US") setHomeportRegion("");
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
                        <>
                          <div className="flex flex-wrap gap-4">
                            <div className={fieldWrapSm}>
                              <label className={labelBase}>City</label>
                              <input
                                className={inputBase}
                                value={homeportCity}
                                onChange={(e) => setHomeportCity(e.target.value)}
                                autoComplete="address-level2"
                              />
                            </div>

                            <div className={fieldWrapSm}>
                              <label className={labelBase}>Region / Province (optional)</label>
                              <input
                                className={inputBase}
                                value={homeportState}
                                onChange={(e) => setHomeportState(e.target.value)}
                                placeholder="ex: Ontario, Andalucía, Queensland"
                                autoComplete="address-level1"
                              />
                            </div>
                          </div>
                          <div className="text-xs text-slate-600">
                            Optional, but helps us match location-based searches more accurately outside the U.S.
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Broker fields */}
                  {sellerRole === "BROKER" && (
                    <div className="space-y-3 rounded-2xl border bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-[#0a2230]">Broker details (optional)</div>

                      <div className={fieldWrap}>
                        <label className={labelBase}>
                          Brokerage name <span className="font-normal text-slate-500">(recommended)</span>
                        </label>
                        <input
                          className={inputBase}
                          placeholder="Brokerage / Company"
                          value={brokerageName}
                          onChange={(e) => setBrokerageName(e.target.value)}
                          autoComplete="organization"
                        />
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <div className={fieldWrapSm}>
                          <label className={labelBase}>Street (optional)</label>
                          <input
                            className={inputBase}
                            placeholder="Street address"
                            value={brokerageStreet}
                            onChange={(e) => setBrokerageStreet(e.target.value)}
                            autoComplete="street-address"
                          />
                        </div>

                        <div className={fieldWrapSm}>
                          <label className={labelBase}>City (optional)</label>
                          <input
                            className={inputBase}
                            placeholder="City"
                            value={brokerageCity}
                            onChange={(e) => setBrokerageCity(e.target.value)}
                            autoComplete="address-level2"
                          />
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
                            <input
                              className={inputBase}
                              placeholder="State"
                              value={brokerageState}
                              onChange={(e) => setBrokerageState(e.target.value)}
                              autoComplete="address-level1"
                            />
                          </div>
                        ) : null}
                      </div>

                      <div className="text-xs text-slate-600">
                        These details pre-fill the broker section when you create a listing.
                      </div>
                    </div>
                  )}

                  {/* Password + show toggle */}
                  <div className={fieldWrap}>
                    <div className="mb-2 flex items-center justify-between">
                      <label className={labelBase}>
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
                      className={inputBase}
                      placeholder="8+ characters"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <div className="mt-2 text-xs text-slate-600">Minimum 8 characters.</div>
                  </div>

                  {/* Confirm password */}
                  <div className={fieldWrap}>
                    <label className={labelBase}>
                      Confirm password <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 ${
                        mismatch ? "border-red-300 focus:ring-red-200" : "focus:ring-[#c8a44d]/40"
                      } bg-white`}
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

          <div className="mt-6 text-xs text-slate-500">
            Note: Phone input styling comes from <code>react-international-phone/style.css</code>. You can customize later.
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
