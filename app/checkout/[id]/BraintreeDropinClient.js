"use client";

import { useEffect, useRef, useState } from "react";
import dropin from "braintree-web-drop-in";

function money2(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(2) : "0.00";
}

async function withTimeout(promise, ms, label = "operation") {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(`${label} timed out`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

export default function BraintreeDropinClient({
  listingId,
  amountUsd,
  plan,
  onPaid,
  className = "",
}) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);

  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  async function teardown() {
    const inst = instanceRef.current;
    instanceRef.current = null;
    setReady(false);

    if (inst) {
      try {
        await inst.teardown();
      } catch {
        // ignore
      }
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr("");
      setReady(false);

      try {
        if (!containerRef.current) throw new Error("Payment container missing.");

        // ensure empty container
        containerRef.current.innerHTML = "";

        const res = await fetch("/api/braintree/client-token");
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.clientToken) {
          throw new Error(data?.error || "Failed to fetch client token.");
        }

        if (cancelled) return;

        const amountStr = money2(amountUsd);

        // ✅ If PayPal keeps throwing “Developer Error”, try switching flow to "vault" temporarily:
        // const paypalConfig = { flow: "vault", billingAgreementDescription: "SailboatTrade listing submission" };

        const paypalConfig = {
          flow: "checkout",
          amount: amountStr,
          currency: "USD",
        };

        const inst = await withTimeout(
          dropin.create({
            authorization: data.clientToken,
            container: containerRef.current,
            paypal: paypalConfig,
          }),
          15000,
          "dropin.create"
        );

        if (cancelled) {
          try {
            await inst.teardown();
          } catch {}
          return;
        }

        instanceRef.current = inst;
        setReady(true);
      } catch (e) {
        setErr(e?.message || "Failed to load payment system.");
      }
    })();

    return () => {
      cancelled = true;
      teardown();
    };
    // init once per mount; parent key remounts on plan/amount change
  }, []);

  async function pay() {
    setErr("");
    setBusy(true);

    try {
      const inst = instanceRef.current;
      if (!inst) throw new Error("Payment UI not ready yet.");

      const pm = await inst.requestPaymentMethod();
      const nonce = pm?.nonce;
      if (!nonce) throw new Error("Missing payment nonce.");

      const res = await fetch("/api/braintree/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId,
          plan, // ✅ MUST be sent so server charges correct amount
          nonce,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Payment failed.");

      onPaid?.(data);
    } catch (e) {
      setErr(e?.message || "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <div ref={containerRef} />

      {err ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={pay}
          disabled={!ready || busy}
          className="inline-flex h-10 items-center justify-center rounded-full bg-[#0a2230] px-8 text-[13px] font-semibold text-white hover:bg-[#0f2a3b] disabled:opacity-60"
        >
          {busy ? "Processing…" : ready ? "Pay now" : "Loading checkout…"}
        </button>
      </div>
    </div>
  );
}
