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
import { getCountryOptions } from "@/lib/countries";

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

function BillingField({ label, hint, children, span = "" }) {
  return (
    <label className={`block ${span}`}>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</div>
      {children}
      {hint ? <div className="mt-1 text-[10px] text-slate-500">{hint}</div> : null}
    </label>
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
  const countryOptions = useMemo(() => getCountryOptions("en"), []);
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
  const selectedCountryCode = textOrEmpty(billingAddress.countryCode || "US").toUpperCase() || "US";
  const countryLabel =
    countryOptions.find((option) => option.value === selectedCountryCode)?.label || "Selected country";
  const regionLabel = selectedCountryCode === "US" ? "State" : "State / Province / Region";

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
              "font-size": "14px",
              "font-family": "ui-sans-serif, system-ui, sans-serif",
              "line-height": "20px",
              padding: "10px 12px",
              color: "#0f172a",
            },
            ".invalid": { color: "#7f1d1d" },
          }}
        >
          <div className="mx-auto w-full sm:max-w-[80%]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.07)]">
              <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] px-4 py-3">
                <div className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Card Checkout</div>
                <div className="mt-1 text-[14px] font-semibold text-[#0a2230]">Secure payment card details</div>
              </div>

              <div className="space-y-5 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <BillingField label="Cardholder name" hint="Enter the name as it appears on the card." span="sm:col-span-2">
                    <div className="rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-[#c8a44d] focus-within:ring-2 focus-within:ring-[#c8a44d]/25">
                      <PayPalNameField />
                    </div>
                  </BillingField>

                  <BillingField label="Card number" span="sm:col-span-2">
                    <div className="rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-[#c8a44d] focus-within:ring-2 focus-within:ring-[#c8a44d]/25">
                      <PayPalNumberField />
                    </div>
                  </BillingField>

                  <BillingField label="Expiry date">
                    <div className="rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-[#c8a44d] focus-within:ring-2 focus-within:ring-[#c8a44d]/25">
                      <PayPalExpiryField />
                    </div>
                  </BillingField>

                  <BillingField label="Security code" hint="3 or 4 digits, depending on the card.">
                    <div className="rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-[#c8a44d] focus-within:ring-2 focus-within:ring-[#c8a44d]/25">
                      <PayPalCVVField />
                    </div>
                  </BillingField>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Billing Address</div>
                  <div className="mt-1 text-[12px] text-slate-600">
                    Use the card billing address for <span className="font-semibold">{countryLabel}</span>.
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <BillingField label="Country / Region" span="sm:col-span-2">
                      <select
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 shadow-sm outline-none focus:border-[#c8a44d] focus:ring-2 focus:ring-[#c8a44d]/25"
                        value={selectedCountryCode}
                        onChange={(e) => handleBillingAddressChange("countryCode", e.target.value.toUpperCase())}
                      >
                        {countryOptions.map((option) => (
                          <option key={option.value || "blank"} value={option.value || "US"}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </BillingField>

                    <BillingField label="Address line 1" span="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Street address"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 shadow-sm outline-none focus:border-[#c8a44d] focus:ring-2 focus:ring-[#c8a44d]/25"
                        value={billingAddress.addressLine1}
                        onChange={(e) => handleBillingAddressChange("addressLine1", e.target.value)}
                      />
                    </BillingField>

                    <BillingField label="Address line 2" hint="Apartment, suite, unit, building, floor, etc.">
                      <input
                        type="text"
                        placeholder="Apartment, suite, unit, building"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 shadow-sm outline-none focus:border-[#c8a44d] focus:ring-2 focus:ring-[#c8a44d]/25"
                        value={billingAddress.addressLine2}
                        onChange={(e) => handleBillingAddressChange("addressLine2", e.target.value)}
                      />
                    </BillingField>

                    <div className="hidden sm:block" aria-hidden="true" />

                    <BillingField label="City / Locality">
                      <input
                        type="text"
                        placeholder="City"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 shadow-sm outline-none focus:border-[#c8a44d] focus:ring-2 focus:ring-[#c8a44d]/25"
                        value={billingAddress.adminArea2}
                        onChange={(e) => handleBillingAddressChange("adminArea2", e.target.value)}
                      />
                    </BillingField>

                    <BillingField label={regionLabel}>
                      <input
                        type="text"
                        placeholder={regionLabel}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 shadow-sm outline-none focus:border-[#c8a44d] focus:ring-2 focus:ring-[#c8a44d]/25"
                        value={billingAddress.adminArea1}
                        onChange={(e) => handleBillingAddressChange("adminArea1", e.target.value)}
                      />
                    </BillingField>

                    <BillingField label="Postal code / ZIP">
                      <input
                        type="text"
                        placeholder="Postal code / ZIP"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 shadow-sm outline-none focus:border-[#c8a44d] focus:ring-2 focus:ring-[#c8a44d]/25"
                        value={billingAddress.postalCode}
                        onChange={(e) => handleBillingAddressChange("postalCode", e.target.value)}
                      />
                    </BillingField>
                  </div>
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
          </div>
        </PayPalCardFieldsProvider>
      </div>
    </PayPalScriptProvider>
  );
}
