// app/checkout/[id]/ui.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dropin from "braintree-web-drop-in";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

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
  initialPhotoPlan,        // "FREE_3" | "PHOTO_PLUS_25"
  initialFeaturedHome,     // boolean
  billingStatus,           // "FREE" | "ACTIVE" | "PAST_DUE" | "CANCELED"
  hasSubscription,
  cancelAtPeriodEnd,
  currentPeriodEnd,
}) {
  const [photoPlus, setPhotoPlus] = useState(String(initialPhotoPlan || "") === "PHOTO_PLUS_25");
  const [featuredHome, setFeaturedHome] = useState(Boolean(initialFeaturedHome));

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
      card: { cardholderName: { required: true } },
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
          paymentMethodNonce: nonce,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Subscription failed.");

      window.location.assign(data.redirect || `/listings/${listingId}?success=1`);
    } catch (e) {
      setErr(e?.message || "Subscription failed.");
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
            disabled={requirePhotoPlusByPhotos || busy || (hasSubscription && (billingStatus === "ACTIVE" || billingStatus === "PAST_DUE"))}
            onClick={() => setPhotoPlus((v) => !v)}
          >
            Photo Plus (up to {maxPhotos}) {photoPlusPrice}/mo
          </Pill>

          <Pill
            active={featuredHome}
            disabled={busy || (hasSubscription && (billingStatus === "ACTIVE" || billingStatus === "PAST_DUE"))}
            onClick={() => setFeaturedHome((v) => !v)}
          >
            Featured Home {featuredPrice}/mo
          </Pill>
        </div>

        <div className="mt-3 text-[12px] text-slate-600">
          Upgrades auto-renew monthly until canceled.
          {(hasSubscription && (billingStatus === "ACTIVE" || billingStatus === "PAST_DUE")) ? (
            <span className="ml-1">To change upgrades, cancel first (preproduction simplification).</span>
          ) : null}
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{err}</div>
      ) : null}
      {msg ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">{msg}</div>
      ) : null}

      {needsPaymentUI ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <div className="text-[13px] font-extrabold text-[#0a2230]">Payment</div>
          <div className="mt-2" ref={dropinRef} />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={busy || overMax}
              onClick={subscribeAndSubmit}
              className={`inline-flex h-10 items-center justify-center rounded-full px-6 text-[13px] font-semibold text-white ${
                busy ? "bg-slate-300 cursor-not-allowed" : "bg-[#0a2230] hover:bg-[#0f2a3b]"
              }`}
            >
              {busy ? "Processing…" : "Start subscription & submit"}
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