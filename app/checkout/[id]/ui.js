// app/checkout/[id]/ui.js
"use client";

import { useEffect, useState } from "react";
import PayPalExpandedCheckout from "./PayPalExpandedCheckout";
import PayPalSubscriptionCheckout from "./PayPalSubscriptionCheckout";

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
          ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
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
          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
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
  initialBillingAutoRenew,
}) {
  const [photoPlus, setPhotoPlus] = useState(String(initialPhotoPlan || "") === "PHOTO_PLUS_25");
  const [featuredHome, setFeaturedHome] = useState(Boolean(initialFeaturedHome));
  const [termMonths, setTermMonths] = useState(clampTerm(initialTermMonths));
  const [autoRenew, setAutoRenew] = useState(Boolean(initialBillingAutoRenew));
  const [autoRenewActive, setAutoRenewActive] = useState(Boolean(initialBillingAutoRenew));
  const [cancelingAutoRenew, setCancelingAutoRenew] = useState(false);
  const initialPhotoPlusActive = String(initialPhotoPlan || "") === "PHOTO_PLUS_25";
  const initialFeaturedHomeActive = Boolean(initialFeaturedHome);
  const initialAutoRenewActive = Boolean(initialBillingAutoRenew);

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
  const disableChanges = busy;
  const hasUpgradeChange =
    photoPlus !== initialPhotoPlusActive || featuredHome !== initialFeaturedHomeActive;
  const paymentDisabled = overMax || (hasActiveBilling && !hasUpgradeChange);
  const canChooseAutoRenew = needsPaymentUI && !hasActiveBilling;

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

  async function cancelAutoRenew() {
    if (cancelingAutoRenew) return;
    setErr("");
    setCancelingAutoRenew(true);
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(listingId)}/cancel-auto-renew`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not cancel auto-renew.");
      }
      setAutoRenewActive(false);
    } catch (e) {
      setErr(e?.message || "Could not cancel auto-renew.");
    } finally {
      setCancelingAutoRenew(false);
    }
  }

  return (
    <div className="space-y-4">
      {showSubBox ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-700">
          <div className="font-extrabold text-[#0a2230]">Subscription status</div>
          <div className="mt-1">
            Status: <span className="font-semibold">{billingStatus || "FREE"}</span>
            {providerUpper ? <span className="text-slate-500"> • Provider: {providerUpper}</span> : null}
            {currentPeriodEnd ? <span className="text-slate-500"> • Period ends: {new Date(currentPeriodEnd).toLocaleString()}</span> : null}
            <span className="text-slate-500"> • Auto-renew: {autoRenewActive ? "On" : "Off"}</span>
          </div>
          {autoRenewActive ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={cancelAutoRenew}
                disabled={cancelingAutoRenew}
                className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 text-[12px] font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelingAutoRenew ? "Stopping…" : "Cancel auto-renew"}
              </button>
              <div className="mt-2 text-[12px] text-slate-600">
                This stops future recurring PayPal charges. Your current paid term remains active through its existing end date.
              </div>
            </div>
          ) : null}
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
              {autoRenew
                ? "Auto-renew charges this same term repeatedly until the customer cancels in PayPal."
                : "Billing is fixed-term only. Choose 1, 3, or 6 months."}
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3 text-[12px] text-slate-700">
              <div className="font-extrabold text-[#0a2230]">Renewal preference</div>
              {canChooseAutoRenew ? (
                <label className="mt-2 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0a2230] focus:ring-[#c8a44d]"
                  />
                  <span>
                    <span className="font-semibold">Enable PayPal auto-renew</span>
                    <span className="block text-slate-600">
                      Optional for paid listings only. Free listings continue to renew manually.
                    </span>
                  </span>
                </label>
              ) : (
                <div className="mt-2 text-slate-600">
                  {initialAutoRenewActive
                    ? autoRenewActive
                      ? "Auto-renew is active for this listing."
                      : "Auto-renew has been canceled for this listing."
                    : "Auto-renew can be chosen when starting a new paid term. Active paid terms continue through their current billing cycle."}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-3 text-[12px] text-slate-600">
            Free checkout. Your listing will be sent to admin review after submit.
          </div>
        )}

        {needsPaymentUI && hasActiveBilling ? (
          <div className="mt-3 text-[12px] text-slate-600">
            {hasUpgradeChange
              ? "This listing already has active billing, but you can still purchase additional upgrades."
              : "This listing already has active billing. Select a new upgrade to continue checkout."}
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
            <div className="text-slate-600">
              {autoRenew
                ? `Renews automatically every ${termMonths} month${termMonths === 1 ? "" : "s"} until canceled in PayPal.`
                : "Billing stops after the selected term."}
            </div>
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
            {autoRenew ? (
              <PayPalSubscriptionCheckout
                key={`paypal-sub-${listingId}-${photoPlus ? "1" : "0"}-${featuredHome ? "1" : "0"}-${termMonths}`}
                listingId={listingId}
                clientId={paypalClientId}
                photoPlus={photoPlus}
                featuredHome={featuredHome}
                termMonths={termMonths}
                disabled={paymentDisabled}
                onBusyChange={setBusy}
                onError={setErr}
                onSuccess={(data) => {
                  window.location.assign(data?.redirect || `/checkout/${listingId}?success=1`);
                }}
              />
            ) : (
              <PayPalExpandedCheckout
                key={`paypal-${listingId}-${photoPlus ? "1" : "0"}-${featuredHome ? "1" : "0"}-${termMonths}`}
                listingId={listingId}
                clientId={paypalClientId}
                photoPlus={photoPlus}
                featuredHome={featuredHome}
                termMonths={termMonths}
                disabled={paymentDisabled}
                onBusyChange={setBusy}
                onError={setErr}
                onSuccess={(data) => {
                  window.location.assign(data?.redirect || `/checkout/${listingId}?success=1`);
                }}
              />
            )}
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
