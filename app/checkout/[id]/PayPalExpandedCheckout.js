"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PayPalButtons,
  PayPalCardFieldsProvider,
  PayPalCVVField,
  PayPalExpiryField,
  PayPalNameField,
  PayPalNumberField,
  PayPalScriptProvider,
  usePayPalCardFields,
} from "@paypal/react-paypal-js";

function textOrEmpty(value) {
  return String(value || "").trim();
}

function buildServerError(payload, fallback) {
  const base = textOrEmpty(payload?.error) || fallback;
  const issue = textOrEmpty(payload?.issue);
  const debugId = textOrEmpty(payload?.debugId);
  const extra = [issue, debugId ? `debug_id: ${debugId}` : ""].filter(Boolean).join(" • ");
  return extra ? `${base} (${extra})` : base;
}

function SubmitCardButton({ disabled, isPaying, setIsPaying, billingAddress, setBusy, onError }) {
  const { cardFieldsForm } = usePayPalCardFields();

  async function handleClick() {
    if (!cardFieldsForm) {
      onError?.("Card fields are unavailable for this PayPal account/environment.");
      return;
    }

    const formState = await cardFieldsForm.getState();
    if (!formState?.isFormValid) {
      onError?.("Please complete valid card details before submitting.");
      return;
    }

    setIsPaying(true);
    setBusy(true);
    try {
      await cardFieldsForm.submit({ billingAddress });
    } catch (e) {
      onError?.(textOrEmpty(e?.message) || "Card payment could not be submitted.");
    } finally {
      setBusy(false);
      setIsPaying(false);
    }
  }

  return (
    <div className="mt-3 flex justify-end">
      <button
        type="button"
        disabled={disabled || isPaying}
        onClick={handleClick}
        className="inline-flex h-10 items-center justify-center rounded-full bg-[#0a2230] px-6 text-[13px] font-semibold text-white hover:bg-[#0f2a3b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPaying ? "Processing…" : "Pay"}
      </button>
    </div>
  );
}

export default function PayPalExpandedCheckout({
  listingId,
  photoPlus,
  featuredHome,
  termMonths,
  disabled = false,
  onBusyChange,
  onError,
  onSuccess,
}) {
  const clientId = textOrEmpty(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID);
  const [isPaying, setIsPaying] = useState(false);
  const [billingAddress, setBillingAddress] = useState({
    addressLine1: "",
    addressLine2: "",
    adminArea1: "",
    adminArea2: "",
    countryCode: "US",
    postalCode: "",
  });

  useEffect(() => {
    onBusyChange?.(Boolean(isPaying));
  }, [isPaying, onBusyChange]);

  function setBusy(v) {
    onBusyChange?.(Boolean(v));
  }

  function setError(message) {
    onError?.(textOrEmpty(message));
  }

  function handleBillingAddressChange(field, value) {
    setBillingAddress((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function createOrderCallback() {
    const res = await fetch("/api/paypal/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        photoPlus: Boolean(photoPlus),
        featuredHome: Boolean(featuredHome),
        termMonths,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.ok) {
      throw new Error(buildServerError(payload, `Could not create order (${res.status}).`));
    }
    if (!payload?.orderId) throw new Error("PayPal order was not created.");
    return payload.orderId;
  }

  async function onApproveCallback(data, actions) {
    const res = await fetch("/api/paypal/orders/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: data?.orderID,
        checkoutContext: {
          listingId,
          photoPlus: Boolean(photoPlus),
          featuredHome: Boolean(featuredHome),
          termMonths,
        },
      }),
    });
    const payload = await res.json().catch(() => ({}));

    if (!res.ok || !payload?.ok) {
      if (payload?.recoverable && actions?.restart) {
        return actions.restart();
      }
      throw new Error(buildServerError(payload, `Could not capture order (${res.status}).`));
    }

    onSuccess?.(payload);
    return payload;
  }

  const scriptOptions = useMemo(
    () => ({
      "client-id": clientId,
      components: "buttons,card-fields",
      currency: "USD",
      intent: "capture",
      commit: "true",
      "buyer-country": "US",
      "enable-funding": "venmo",
      "disable-funding": "paylater",
      "data-sdk-integration-source": "developer-studio",
    }),
    [clientId]
  );

  if (!clientId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
        Missing `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
        Checkout is currently unavailable for this listing state.
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={scriptOptions}>
      <div className="space-y-4">
        <PayPalButtons
          style={{ shape: "pill", layout: "horizontal", color: "gold", label: "checkout" }}
          createOrder={createOrderCallback}
          onApprove={async (data, actions) => {
            setBusy(true);
            setError("");
            try {
              await onApproveCallback(data, actions);
            } catch (e) {
              setError(textOrEmpty(e?.message) || "PayPal checkout failed.");
            } finally {
              setBusy(false);
            }
          }}
          onError={(err) => {
            setError(textOrEmpty(err?.message) || "PayPal checkout failed.");
          }}
        />

        <PayPalCardFieldsProvider
          createOrder={createOrderCallback}
          onApprove={async (data, actions) => {
            setBusy(true);
            setError("");
            try {
              await onApproveCallback(data, actions);
            } catch (e) {
              setError(textOrEmpty(e?.message) || "Card payment failed.");
            } finally {
              setBusy(false);
            }
          }}
          onError={(err) => {
            setError(textOrEmpty(err?.message) || "Card payment failed.");
          }}
          style={{
            input: {
              "font-size": "16px",
              "font-family": "ui-sans-serif, system-ui, sans-serif",
              color: "#0f172a",
            },
            ".invalid": { color: "#7f1d1d" },
          }}
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-[12px] font-semibold text-slate-700">Card checkout</div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-300 bg-white px-2 py-2 sm:col-span-2">
                <PayPalNameField />
              </div>
              <div className="rounded-lg border border-slate-300 bg-white px-2 py-2 sm:col-span-2">
                <PayPalNumberField />
              </div>
              <div className="rounded-lg border border-slate-300 bg-white px-2 py-2">
                <PayPalExpiryField />
              </div>
              <div className="rounded-lg border border-slate-300 bg-white px-2 py-2">
                <PayPalCVVField />
              </div>
            </div>

            <div className="mt-3 text-[12px] font-semibold text-slate-700">Billing Address</div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Address line 1"
                className="h-10 rounded-lg border border-slate-300 px-3 text-[13px] text-slate-800 sm:col-span-2"
                value={billingAddress.addressLine1}
                onChange={(e) => handleBillingAddressChange("addressLine1", e.target.value)}
              />
              <input
                type="text"
                placeholder="Address line 2"
                className="h-10 rounded-lg border border-slate-300 px-3 text-[13px] text-slate-800 sm:col-span-2"
                value={billingAddress.addressLine2}
                onChange={(e) => handleBillingAddressChange("addressLine2", e.target.value)}
              />
              <input
                type="text"
                placeholder="City"
                className="h-10 rounded-lg border border-slate-300 px-3 text-[13px] text-slate-800"
                value={billingAddress.adminArea2}
                onChange={(e) => handleBillingAddressChange("adminArea2", e.target.value)}
              />
              <input
                type="text"
                placeholder="State"
                className="h-10 rounded-lg border border-slate-300 px-3 text-[13px] text-slate-800"
                value={billingAddress.adminArea1}
                onChange={(e) => handleBillingAddressChange("adminArea1", e.target.value)}
              />
              <input
                type="text"
                placeholder="Country code (US)"
                className="h-10 rounded-lg border border-slate-300 px-3 text-[13px] text-slate-800"
                value={billingAddress.countryCode}
                onChange={(e) => handleBillingAddressChange("countryCode", e.target.value.toUpperCase())}
              />
              <input
                type="text"
                placeholder="Postal/zip code"
                className="h-10 rounded-lg border border-slate-300 px-3 text-[13px] text-slate-800"
                value={billingAddress.postalCode}
                onChange={(e) => handleBillingAddressChange("postalCode", e.target.value)}
              />
            </div>

            <SubmitCardButton
              disabled={disabled}
              isPaying={isPaying}
              setIsPaying={setIsPaying}
              billingAddress={billingAddress}
              setBusy={setBusy}
              onError={setError}
            />
          </div>
        </PayPalCardFieldsProvider>
      </div>
    </PayPalScriptProvider>
  );
}
