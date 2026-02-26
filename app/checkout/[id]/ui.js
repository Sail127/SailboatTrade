// app/checkout/[id]/ui.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dropin from "braintree-web-drop-in";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

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

function isNonceReuseErrorMessage(msg) {
  const s = String(msg || "").toLowerCase();
  return (
    s.includes("payment_method_nonce") &&
    (s.includes("more than once") || s.includes("already used") || s.includes("cannot use"))
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

export default function CheckoutUI({
  listingId,
  titleLine,
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
  hasSubscription,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  initialTermMonths,
  initialAutoRenew,
}) {
  const [photoPlus, setPhotoPlus] = useState(String(initialPhotoPlan || "") === "PHOTO_PLUS_25");
  const [featuredHome, setFeaturedHome] = useState(Boolean(initialFeaturedHome));
  const [termMonths, setTermMonths] = useState(clampTerm(initialTermMonths));
  const [autoRenew, setAutoRenew] = useState(Boolean(initialAutoRenew));

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
  const isFreeCheckout = !needsPaymentUI;

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const baseMonthlyCents =
    (photoPlus ? Number(photoPlusCents || 0) : 0) +
    (featuredHome ? Number(featuredCents || 0) : 0);
  const termFactor = discountFactor(termMonths);
  const discountedMonthlyCents = Math.round(baseMonthlyCents * termFactor);
  const totalCents = discountedMonthlyCents * termMonths;
  const disableChanges = busy || (hasSubscription && (billingStatus === "ACTIVE" || billingStatus === "PAST_DUE"));

  // Braintree drop-in
  const dropinRef = useRef(null);
  const instanceRef = useRef(null);

  async function ensureDropin() {
    if (!needsPaymentUI) return;
    if (instanceRef.current) return;

    const res = await fetch("/api/billing/braintree/token", { method: "GET", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.clientToken) throw new Error(data?.error || "Could not initialize payment.");

    const inst = await dropin.create({
      authorization: data.clientToken,
      container: dropinRef.current,
      paymentOptionPriority: ["paypal", "card"],
      card: { cardholderName: { required: true } },
      paypal: {
        flow: "vault",
        billingAgreementDescription: "SailboatTrade listing subscription",
      },
    });

    instanceRef.current = inst;
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (needsPaymentUI) await ensureDropin();
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Could not load payment form.");
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsPaymentUI]);

  useEffect(() => {
    return () => {
      (async () => {
        try {
          if (instanceRef.current) {
            await instanceRef.current.teardown();
            instanceRef.current = null;
          }
        } catch {}
      })();
    };
  }, []);

  const entitlementLine = useMemo(() => {
    const max = photoPlus ? maxPhotos : freePhotoLimit;
    return `You have ${photoCount} photos. This selection allows up to ${max}.`;
  }, [photoPlus, maxPhotos, freePhotoLimit, photoCount]);

  async function submitFree() {
    setErr("");
    setMsg("");
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

  async function subscribeAndSubmit() {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      if (overMax) throw new Error(`You have ${photoCount} photos. Max allowed is ${maxPhotos}. Remove photos first.`);
      if (photoCount > freePhotoLimit && !photoPlus) throw new Error("Photo Plus is required for more than the free photo limit.");
      const termSafe = clampTerm(termMonths);
      if (termSafe !== termMonths) setTermMonths(termSafe);

      if (hasSubscription && (billingStatus === "ACTIVE" || billingStatus === "PAST_DUE")) {
        throw new Error("You already have an active subscription for this listing. Cancel it first if you want to change upgrades.");
      }

      await ensureDropin();
      if (!instanceRef.current) throw new Error("Payment form not ready.");

      const pm = await instanceRef.current.requestPaymentMethod();
      const nonce = pm?.nonce;
      if (!nonce) throw new Error("Could not capture payment method.");

      const res = await fetch("/api/billing/braintree/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          photoPlus: Boolean(photoPlus),
          featuredHome: Boolean(featuredHome),
          termMonths,
          autoRenew: Boolean(autoRenew),
          paymentMethodNonce: nonce,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Subscription failed.");

      window.location.assign(data.redirect || `/checkout/${listingId}?success=1`);
    } catch (e) {
      const rawMsg = e?.message || "Subscription failed.";
      if (isNonceReuseErrorMessage(rawMsg)) {
        try {
          if (instanceRef.current?.clearSelectedPaymentMethod) {
            await instanceRef.current.clearSelectedPaymentMethod();
          }
        } catch {}
        setErr("Your previous payment authorization expired. Please choose your payment method again, then click Purchase.");
      } else {
        setErr(rawMsg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function cancelSubscription() {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch("/api/billing/braintree/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not cancel subscription.");

      setMsg("Subscription canceled.");
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setErr(e?.message || "Could not cancel subscription.");
    } finally {
      setBusy(false);
    }
  }

  const showSubBox = hasSubscription || (billingStatus && billingStatus !== "FREE");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
        <div className="font-extrabold text-[#0a2230]">Photo limits</div>
        <div className="mt-1">{entitlementLine}</div>

        {photoCount > freePhotoLimit ? (
          <div className="mt-2 text-amber-900">
            Your photo count exceeds the free limit, so <span className="font-semibold">Photo Plus</span> is required unless you remove photos.
          </div>
        ) : null}

        {overMax ? (
          <div className="mt-2 text-red-700 font-semibold">
            This listing exceeds the maximum photo limit ({maxPhotos}). Remove photos to continue.
          </div>
        ) : null}
      </div>

      {showSubBox ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-700">
          <div className="font-extrabold text-[#0a2230]">Subscription status</div>
          <div className="mt-1">
            Status: <span className="font-semibold">{billingStatus || "FREE"}</span>
            {currentPeriodEnd ? <span className="text-slate-500"> • Period ends: {new Date(currentPeriodEnd).toLocaleString()}</span> : null}
            {cancelAtPeriodEnd ? <span className="text-slate-500"> • Cancel scheduled</span> : null}
          </div>

          {hasSubscription && (billingStatus === "ACTIVE" || billingStatus === "PAST_DUE") ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={cancelSubscription}
                disabled={busy}
                className="text-[12px] font-semibold text-red-600 underline underline-offset-2 hover:text-red-700"
              >
                Cancel auto-renew
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <div className="text-[12px] font-extrabold tracking-wide text-slate-600">Upgrades</div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Pill
            active={photoPlus}
            disabled={requirePhotoPlusByPhotos || disableChanges}
            onClick={() => setPhotoPlus((v) => !v)}
          >
            Photo Plus (up to {maxPhotos}) {photoPlusPrice}/mo
          </Pill>

          <Pill
            active={featuredHome}
            disabled={disableChanges}
            onClick={() => setFeaturedHome((v) => !v)}
          >
            Featured Home {featuredPrice}/mo
          </Pill>
        </div>

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

            <div
              className={`mt-4 flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${
                disableChanges ? "border-slate-200 bg-slate-100" : "border-slate-300 bg-white"
              }`}
            >
              <div>
                <div className="text-[13px] font-extrabold text-[#0a2230]">Auto-renew at end of term</div>
                <div className="mt-0.5 text-[12px] text-slate-600">
                  Optional. Keep this listing active without manually renewing.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoRenew}
                aria-label="Auto-renew at end of term"
                onClick={() => setAutoRenew((v) => !v)}
                disabled={disableChanges}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                  disableChanges
                    ? "cursor-not-allowed bg-slate-300 opacity-70"
                    : autoRenew
                    ? "bg-emerald-500"
                    : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    autoRenew ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </>
        ) : (
          <div className="mt-3 text-[12px] text-slate-600">
            Free checkout. Your listing will be sent to admin review after submit.
          </div>
        )}

        {needsPaymentUI && (hasSubscription && (billingStatus === "ACTIVE" || billingStatus === "PAST_DUE")) ? (
          <div className="mt-3 text-[12px] text-slate-600">
            To change upgrades, cancel first (preproduction simplification).
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
            <div>
              Estimated total for term:{" "}
              <span className="font-semibold">{formatMoneyFromCents(totalCents)}</span>
            </div>
            {autoRenew ? (
              <div className="text-slate-600">
                Auto-renew is on. Billing continues monthly at the discounted rate until you cancel.
              </div>
            ) : (
              <div className="text-slate-600">
                Auto-renew is off. Billing stops after the selected term.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{err}</div>
      ) : null}
      {msg ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">{msg}</div>
      ) : null}

      {needsPaymentUI ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <div className="text-[13px] font-extrabold text-[#0a2230]">Payment</div>
          <div className="mt-1 text-[12px] text-slate-600">Pay with card or PayPal.</div>
          <div className="mt-2" ref={dropinRef} />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={busy || overMax}
              onClick={subscribeAndSubmit}
              className={`inline-flex h-10 items-center justify-center rounded-full px-6 text-[13px] font-semibold ${
                busy
                  ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                  : "hover:brightness-95"
              }`}
              style={busy ? undefined : { backgroundColor: GOLD, color: NAVY }}
            >
              {busy ? "Processing…" : "Purchase"}
            </button>
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
