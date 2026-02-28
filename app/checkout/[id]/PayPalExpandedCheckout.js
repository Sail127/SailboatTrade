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

function normalizeSdkErrorMessage(err, fallback) {
  const msg = textOrEmpty(err?.message || err);
  const lower = msg.toLowerCase();
  if (lower.includes("window closed before response") || lower.includes("postrobot_method before ack")) {
    return "Payment window was closed before PayPal finished. Please allow popups, keep the PayPal window open, and try again.";
  }
  return msg || fallback;
}

function invalidFieldList(formState) {
  const fields = formState?.fields;
  if (!fields || typeof fields !== "object") return [];
  return Object.entries(fields)
    .filter(([, meta]) => meta && typeof meta === "object" && meta.isValid === false)
    .map(([name]) => name);
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
      const invalid = invalidFieldList(formState);
      const detail = invalid.length ? ` Invalid: ${invalid.join(", ")}.` : "";
      onError?.(`Please complete valid card details before submitting.${detail}`);
      return;
    }

    setIsPaying(true);
    setBusy(true);
    try {
      await cardFieldsForm.submit({ billingAddress });
    } catch (e) {
      onError?.(normalizeSdkErrorMessage(e, "Card payment could not be submitted."));
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
        className="inline-flex h-8 items-center justify-center rounded-full bg-[#0a2230] px-4 text-[11px] font-semibold text-white hover:bg-[#0f2a3b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPaying ? "Processing…" : "Pay"}
      </button>
    </div>
  );
}

export default function PayPalExpandedCheckout({
  listingId,
  clientId,
  photoPlus,
  featuredHome,
  termMonths,
  disabled = false,
  onBusyChange,
  onError,
  onSuccess,
}) {
  const resolvedClientId = textOrEmpty(clientId || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID);
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
      "client-id": resolvedClientId,
      components: "buttons,card-fields",
      currency: "USD",
      intent: "capture",
      commit: "true",
      "buyer-country": "US",
      "enable-funding": "venmo",
      "disable-funding": "paylater",
      "data-sdk-integration-source": "developer-studio",
    }),
    [resolvedClientId]
  );

  if (!resolvedClientId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
        Missing PayPal client ID (`NEXT_PUBLIC_PAYPAL_CLIENT_ID` or `PAYPAL_CLIENT_ID`).
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
      <div className="space-y-3">
        <div className="mx-auto w-full sm:max-w-[64%]">
          <PayPalButtons
            style={{
              shape: "pill",
              layout: "horizontal",
              color: "gold",
              label: "checkout",
              height: 32,
              tagline: false,
            }}
            createOrder={createOrderCallback}
            onApprove={async (data, actions) => {
              setBusy(true);
              setError("");
            try {
              await onApproveCallback(data, actions);
            } catch (e) {
              setError(normalizeSdkErrorMessage(e, "PayPal checkout failed."));
            } finally {
              setBusy(false);
            }
          }}
          onError={(err) => {
            setError(normalizeSdkErrorMessage(err, "PayPal checkout failed."));
          }}
        />
        </div>
        <div className="text-center text-[11px] font-extrabold tracking-wide text-slate-600">OR</div>

        <PayPalCardFieldsProvider
          createOrder={createOrderCallback}
          onApprove={async (data, actions) => {
            setBusy(true);
            setError("");
            try {
              await onApproveCallback(data, actions);
            } catch (e) {
              setError(normalizeSdkErrorMessage(e, "Card payment failed."));
            } finally {
              setBusy(false);
            }
          }}
          onError={(err) => {
            setError(normalizeSdkErrorMessage(err, "Card payment failed."));
          }}
          style={{
            input: {
              "font-size": "13px",
              "font-family": "ui-sans-serif, system-ui, sans-serif",
              "line-height": "18px",
              padding: "7px 10px",
              color: "#0f172a",
            },
            ".invalid": { color: "#7f1d1d" },
          }}
        >
          <div className="mx-auto w-full sm:max-w-[80%]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="mb-2 text-[11px] font-semibold text-slate-700">Card checkout</div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-slate-300 bg-white px-2 py-1 sm:col-span-2">
                  <PayPalNameField />
                </div>
                <div className="rounded-md border border-slate-300 bg-white px-2 py-1 sm:col-span-2">
                  <PayPalNumberField />
                </div>
                <div className="rounded-md border border-slate-300 bg-white px-2 py-1">
                  <PayPalExpiryField />
                </div>
                <div className="rounded-md border border-slate-300 bg-white px-2 py-1">
                  <PayPalCVVField />
                </div>
              </div>

              <div className="mt-2 text-[11px] font-semibold text-slate-700">Billing Address</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Address line 1"
                  className="h-8 rounded-md border border-slate-300 px-2 text-[11px] text-slate-800 sm:col-span-2"
                  value={billingAddress.addressLine1}
                  onChange={(e) => handleBillingAddressChange("addressLine1", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Address line 2"
                  className="h-8 rounded-md border border-slate-300 px-2 text-[11px] text-slate-800 sm:col-span-2"
                  value={billingAddress.addressLine2}
                  onChange={(e) => handleBillingAddressChange("addressLine2", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="City"
                  className="h-8 rounded-md border border-slate-300 px-2 text-[11px] text-slate-800"
                  value={billingAddress.adminArea2}
                  onChange={(e) => handleBillingAddressChange("adminArea2", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="State"
                  className="h-8 rounded-md border border-slate-300 px-2 text-[11px] text-slate-800"
                  value={billingAddress.adminArea1}
                  onChange={(e) => handleBillingAddressChange("adminArea1", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Postal/zip code"
                  className="h-8 rounded-md border border-slate-300 px-2 text-[11px] text-slate-800"
                  value={billingAddress.postalCode}
                  onChange={(e) => handleBillingAddressChange("postalCode", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Country code (US)"
                  className="h-8 rounded-md border border-slate-300 px-2 text-[11px] text-slate-800"
                  value={billingAddress.countryCode}
                  onChange={(e) => handleBillingAddressChange("countryCode", e.target.value.toUpperCase())}
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
          </div>
        </PayPalCardFieldsProvider>
      </div>
    </PayPalScriptProvider>
  );
}
