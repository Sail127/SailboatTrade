"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dropin from "braintree-web-drop-in";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

function planLabel(plan) {
  return plan === "FEATURED_HOME" ? "Featured on Homepage" : "Standard Listing";
}

export default function CheckoutUI({ listingId, initialPlan, featuredPrice, standardPrice }) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan || "FEATURED_HOME");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const dropinInstanceRef = useRef(null);
  const dropinContainerRef = useRef(null);

  const priceText = useMemo(() => {
    return plan === "STANDARD" ? standardPrice : featuredPrice;
  }, [plan, featuredPrice, standardPrice]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setErr("");
      setReady(false);

      try {
        const res = await fetch("/api/braintree/client-token", { method: "GET" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load payment system.");

        const clientToken = data?.clientToken;
        if (!clientToken) throw new Error("Missing Braintree client token.");

        if (!dropinContainerRef.current) throw new Error("Missing drop-in container.");

        // Clean up any existing instance
        if (dropinInstanceRef.current) {
          try {
            await dropinInstanceRef.current.teardown();
          } catch {}
          dropinInstanceRef.current = null;
        }

        const instance = await dropin.create({
          authorization: clientToken,
          container: dropinContainerRef.current,
          // PayPal inside drop-in (sandbox will show PayPal option if enabled for your sandbox account)
          paypal: {
            flow: "vault", // keeps it simple; "checkout" also works
          },
          card: {
            cardholderName: true,
          },
        });

        if (cancelled) {
          try { await instance.teardown(); } catch {}
          return;
        }

        dropinInstanceRef.current = instance;
        setReady(true);
      } catch (e) {
        setErr(e?.message || "Failed to initialize checkout.");
      }
    }

    init();

    return () => {
      cancelled = true;
      (async () => {
        if (dropinInstanceRef.current) {
          try {
            await dropinInstanceRef.current.teardown();
          } catch {}
          dropinInstanceRef.current = null;
        }
      })();
    };
  }, []);

  async function payNow() {
    setErr("");
    setBusy(true);

    try {
      const inst = dropinInstanceRef.current;
      if (!inst) throw new Error("Checkout not ready yet.");

      const pm = await inst.requestPaymentMethod(); // returns nonce
      const nonce = pm?.nonce;
      if (!nonce) throw new Error("Missing payment nonce.");

      const res = await fetch("/api/braintree/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId, plan, nonce }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Payment failed.");
      }

      // Refresh server page state (paid / pending review)
      router.replace(`/checkout/${encodeURIComponent(listingId)}?success=1`);
      router.refresh();
    } catch (e) {
      setErr(e?.message || "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="text-[13px] text-slate-700">
        Choose a plan, then pay securely with <span className="font-semibold">card</span> or{" "}
        <span className="font-semibold">PayPal</span>.
        After payment, your listing moves to <span className="font-semibold">PENDING_REVIEW</span> for admin approval.
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <label className="flex items-start gap-3 px-4 py-3 border-b border-slate-200 cursor-pointer">
          <input
            type="radio"
            name="plan"
            value="STANDARD"
            checked={plan === "STANDARD"}
            onChange={() => setPlan("STANDARD")}
            className="mt-1"
          />
          <div className="min-w-0">
            <div className="text-[13px] font-extrabold text-[#0a2230]">
              Standard Listing <span className="ml-2 font-extrabold text-slate-700">{standardPrice}</span>
            </div>
            <div className="text-[12px] text-slate-600">Submit your listing for review and publishing.</div>
          </div>
        </label>

        <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
          <input
            type="radio"
            name="plan"
            value="FEATURED_HOME"
            checked={plan === "FEATURED_HOME"}
            onChange={() => setPlan("FEATURED_HOME")}
            className="mt-1"
          />
          <div className="min-w-0">
            <div className="text-[13px] font-extrabold text-[#0a2230]">
              Featured on Homepage <span className="ml-2 font-extrabold text-slate-700">{featuredPrice}</span>
            </div>
            <div className="text-[12px] text-slate-600">
              Priority placement on the homepage (after admin approval).
            </div>
          </div>
        </label>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[13px] font-extrabold text-[#0a2230]">{planLabel(plan)}</div>
          <div className="text-[13px] font-extrabold text-slate-800">{priceText}</div>
        </div>

        <div className="mt-4">
          <div ref={dropinContainerRef} />
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <Link
            href={`/listings/new?edit=${encodeURIComponent(listingId)}`}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
          >
            Edit Draft
          </Link>

          <button
            type="button"
            onClick={payNow}
            disabled={!ready || busy}
            className="inline-flex h-10 items-center justify-center rounded-full px-8 text-[13px] font-semibold disabled:opacity-60"
            style={{ background: NAVY, color: "white" }}
          >
            {busy ? "Processing…" : ready ? "Pay now" : "Loading checkout…"}
          </button>
        </div>

        <div className="mt-3 text-[11px] text-slate-500">
          Payments are processed securely. (Sandbox mode supported.)
        </div>
      </div>

      <div className="mt-2 text-[11px] text-slate-500">
        Tip: In sandbox, you can set <span className="font-semibold">PAYMENTS_SANDBOX_AUTO_PUBLISH=1</span> to auto-publish
        after payment so you can test the public listing flow.
      </div>
    </>
  );
}
