// app/checkout/[id]/ui.js
"use client";

import { useEffect, useState } from "react";
import PayPalExpandedCheckout from "./PayPalExpandedCheckout";

const TERM_OPTIONS = [1, 3, 6];
const TERM_DISCOUNT = {
  3: 0.9,
  6: 0.8,
};

function clampTerm(v) {
  const n = Number(v);
  if (TERM_OPTIONS.includes(n)) return n;
  return 1;
}

function formatMoneyFromCents(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n / 100);
}

function discountFactor(termMonths) {
  return TERM_DISCOUNT[termMonths] || 1;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Pill({ active, disabled, children, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-9 rounded-full px-4 text-[13px] font-semibold border transition ${
        disabled
          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
          : active
          ? "bg-[#0a2230] text-white border-[#0a2230]"
          : "bg-white text-[#0a2230] border-slate-300 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function UpgradeCheck({ active, disabled, mandatory, label, priceLabel, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
          : active
          ? "border-[#0a2230] bg-[#0a2230]/5 text-[#0a2230]"
          : "border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
      }`}
      aria-pressed={active}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded border ${
              active ? "border-[#0a2230] bg-[#0a2230] text-white" : "border-slate-300 bg-white text-transparent"
            }`}
          >
            <CheckIcon />
          </span>
          <span className="text-[13px] font-semibold">{label}</span>
        </div>
        <span className="text-[13px] font-semibold">{priceLabel}/mo</span>
      </div>
      {mandatory ? (
        <div className="mt-1 pl-7 text-[12px] text-amber-900">
          Required: this listing has more than the free photo limit.
        </div>
      ) : null}
    </button>
  );
}

export default function CheckoutUI({
  listingId,
  titleLine,
  paypalClientId,
  photoCount,
  freePhotoLimit,
  maxPhotos,
  photoPlusPrice,
  featuredPrice,
  photoPlusCents,
  featuredCents,
  initialPhotoPlan,        // "FREE_3" | "PHOTO_PLUS_25"
  initialFeaturedHome,     // boolean
  billingStatus,           // "FREE" | "ACTIVE" | "PAST_DUE" | "CANCELED"
  billingProvider,
  currentPeriodEnd,
  initialTermMonths,
}) {
  const [photoPlus, setPhotoPlus] = useState(String(initialPhotoPlan || "") === "PHOTO_PLUS_25");
  const [featuredHome, setFeaturedHome] = useState(Boolean(initialFeaturedHome));
  const [termMonths, setTermMonths] = useState(clampTerm(initialTermMonths));

  const requirePhotoPlusByPhotos = photoCount > freePhotoLimit;
  const overMax = photoCount > maxPhotos;

  // If photos exceed free limit, force Photo Plus ON
  useEffect(() => {
    if (requirePhotoPlusByPhotos && !photoPlus) setPhotoPlus(true);
  }, [requirePhotoPlusByPhotos, photoPlus]);

  // If user turns Photo Plus off, but photos require it, keep it on
  useEffect(() => {
    if (!photoPlus && requirePhotoPlusByPhotos) setPhotoPlus(true);
  }, [photoPlus, requirePhotoPlusByPhotos]);

  const needsPaymentUI = photoPlus || featuredHome;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const baseMonthlyCents =
    (photoPlus ? Number(photoPlusCents || 0) : 0) +
    (featuredHome ? Number(featuredCents || 0) : 0);
  const termFactor = discountFactor(termMonths);
  const discountedMonthlyCents = Math.round(baseMonthlyCents * termFactor);
  const totalCents = discountedMonthlyCents * termMonths;
  const statusUpper = String(billingStatus || "").toUpperCase();
  const providerUpper = String(billingProvider || "").toUpperCase();
  const hasActiveBilling = statusUpper === "ACTIVE" || statusUpper === "PAST_DUE";
  const disableChanges = busy || hasActiveBilling;

  async function submitFree() {
    setErr("");
    setBusy(true);
    try {
      if (overMax) throw new Error(`You have ${photoCount} photos. Max allowed is ${maxPhotos}. Remove photos first.`);
      if (photoCount > freePhotoLimit) throw new Error(`Free listings allow up to ${freePhotoLimit} photos. Add Photo Plus or remove photos.`);

      const res = await fetch(`/api/listings/${encodeURIComponent(listingId)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "FREE" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not submit listing.");

      window.location.assign(data.redirect || `/listings/${listingId}`);
    } catch (e) {
      setErr(e?.message || "Could not submit listing.");
    } finally {
      setBusy(false);
    }
  }

  const showSubBox = hasActiveBilling || (billingStatus && billingStatus !== "FREE");

  return (
    <div className="space-y-4">
      {showSubBox ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-700">
          <div className="font-extrabold text-[#0a2230]">Subscription status</div>
          <div className="mt-1">
            Status: <span className="font-semibold">{billingStatus || "FREE"}</span>
            {providerUpper ? <span className="text-slate-500"> • Provider: {providerUpper}</span> : null}
            {currentPeriodEnd ? <span className="text-slate-500"> • Period ends: {new Date(currentPeriodEnd).toLocaleString()}</span> : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <div className="text-[12px] font-extrabold tracking-wide text-slate-600">Upgrades</div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <UpgradeCheck
            active={photoPlus}
            disabled={requirePhotoPlusByPhotos || disableChanges}
            mandatory={requirePhotoPlusByPhotos}
            label={`Photo Plus (up to ${maxPhotos})`}
            priceLabel={photoPlusPrice}
            onClick={() => setPhotoPlus((v) => !v)}
          />

          <UpgradeCheck
            active={featuredHome}
            disabled={disableChanges}
            mandatory={false}
            label="Featured Home"
            priceLabel={featuredPrice}
            onClick={() => setFeaturedHome((v) => !v)}
          />
        </div>
        {requirePhotoPlusByPhotos ? (
          <div className="mt-2 text-[12px] text-amber-900">
            You currently have {photoCount} photos. Free allows up to {freePhotoLimit}. Remove photos to make Photo Plus optional.
          </div>
        ) : null}
        {overMax ? (
          <div className="mt-2 text-[12px] font-semibold text-red-700">
            This listing exceeds the maximum photo limit ({maxPhotos}). Remove photos to continue.
          </div>
        ) : null}

        {needsPaymentUI ? (
          <>
            <div className="mt-4 text-[12px] font-extrabold tracking-wide text-slate-600">Term length</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {TERM_OPTIONS.map((m) => (
                <Pill
                  key={m}
                  active={termMonths === m}
                  disabled={disableChanges}
                  onClick={() => setTermMonths(m)}
                >
                  {m} month{m === 1 ? "" : "s"}
                </Pill>
              ))}
            </div>
            <div className="mt-2 text-[12px] text-slate-600">
              3 months = 10% off. 6 months = 20% off.
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[12px] text-slate-600">
              Billing is fixed-term only. Choose 1, 3, or 6 months.
            </div>
          </>
        ) : (
          <div className="mt-3 text-[12px] text-slate-600">
            Free checkout. Your listing will be sent to admin review after submit.
          </div>
        )}

        {needsPaymentUI && hasActiveBilling ? (
          <div className="mt-3 text-[12px] text-slate-600">
            This listing already has active billing. Wait for the current term to end before purchasing again.
          </div>
        ) : null}
      </div>

      {needsPaymentUI ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <div className="text-[13px] font-extrabold text-[#0a2230]">Pricing summary</div>
          <div className="mt-2 text-[12px] text-slate-700 space-y-1">
            <div>
              Monthly (after discount):{" "}
              <span className="font-semibold">{formatMoneyFromCents(discountedMonthlyCents)}</span>
            </div>
            <div>
              Term: <span className="font-semibold">{termMonths} month{termMonths === 1 ? "" : "s"}</span>
            </div>
            <div className="pt-1 text-[13px] font-extrabold text-[#0a2230]">
              Total charge today: {formatMoneyFromCents(totalCents)}
            </div>
            <div className="text-slate-600">Billing stops after the selected term.</div>
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{err}</div>
      ) : null}

      {needsPaymentUI ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <div className="text-[13px] font-extrabold text-[#0a2230]">Payment</div>
          <div className="mt-3">
            <PayPalExpandedCheckout
              key={`paypal-${listingId}-${photoPlus ? "1" : "0"}-${featuredHome ? "1" : "0"}-${termMonths}`}
              listingId={listingId}
              clientId={paypalClientId}
              photoPlus={photoPlus}
              featuredHome={featuredHome}
              termMonths={termMonths}
              disabled={overMax || hasActiveBilling}
              onBusyChange={setBusy}
              onError={setErr}
              onSuccess={(data) => {
                window.location.assign(data?.redirect || `/checkout/${listingId}?success=1`);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={busy || overMax}
            onClick={submitFree}
            className={`inline-flex h-10 items-center justify-center rounded-full px-6 text-[13px] font-semibold text-white ${
              busy ? "bg-slate-300 cursor-not-allowed" : "bg-[#0a2230] hover:bg-[#0f2a3b]"
            }`}
          >
            {busy ? "Submitting…" : "Submit listing (free)"}
          </button>
        </div>
      )}
    </div>
  );
}
