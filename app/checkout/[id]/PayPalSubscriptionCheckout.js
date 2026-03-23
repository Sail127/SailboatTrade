"use client";

import { useMemo } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

function textOrEmpty(value) {
  return String(value || "").trim();
}

function buildServerError(payload, fallback) {
  const base = textOrEmpty(payload?.error) || fallback;
  return base;
}

export default function PayPalSubscriptionCheckout({
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

  const scriptOptions = useMemo(
    () => ({
      "client-id": resolvedClientId,
      components: "buttons",
      currency: "USD",
      vault: true,
      intent: "subscription",
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
        Auto-renew checkout is currently unavailable for this listing state.
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={scriptOptions}>
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[12px] text-slate-700">
          Auto-renew uses a PayPal subscription. Future renewals are billed automatically through your PayPal account.
        </div>
        <div className="mx-auto w-full sm:max-w-[64%]">
          <PayPalButtons
            style={{
              shape: "pill",
              layout: "horizontal",
              color: "gold",
              label: "subscribe",
              height: 32,
              tagline: false,
            }}
            createSubscription={async (_data, actions) => {
              onBusyChange?.(true);
              onError?.("");
              try {
                const res = await fetch("/api/paypal/subscriptions/prepare", {
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
                if (!res.ok || !payload?.ok || !payload?.planId) {
                  throw new Error(buildServerError(payload, `Could not prepare subscription (${res.status}).`));
                }
                return actions.subscription.create({
                  plan_id: payload.planId,
                  custom_id: payload.customId || undefined,
                });
              } finally {
                onBusyChange?.(false);
              }
            }}
            onApprove={async (data) => {
              onBusyChange?.(true);
              onError?.("");
              try {
                const res = await fetch("/api/paypal/subscriptions/activate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    subscriptionId: data?.subscriptionID,
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
                  throw new Error(buildServerError(payload, `Could not activate subscription (${res.status}).`));
                }
                onSuccess?.(payload);
              } catch (error) {
                onError?.(error?.message || "PayPal subscription failed.");
              } finally {
                onBusyChange?.(false);
              }
            }}
            onError={(err) => {
              onError?.(textOrEmpty(err?.message || err) || "PayPal subscription failed.");
            }}
          />
        </div>
      </div>
    </PayPalScriptProvider>
  );
}
