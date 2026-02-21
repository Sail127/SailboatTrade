// lib/braintree.js
import braintree from "braintree";

function must(name, v) {
  const s = String(v || "").trim();
  if (!s) throw new Error(`Missing ${name} (set it in .env.local / Vercel env vars)`);
  return s;
}

let gateway;

export function getBraintreeGateway() {
  if (gateway) return gateway;

  const envRaw = String(process.env.BRAINTREE_ENVIRONMENT || "sandbox").toLowerCase().trim();

  // ✅ tolerate common values: "sandbox", "Sandbox", "SANDBOX", etc.
  const environment =
    envRaw === "production" || envRaw === "prod"
      ? braintree.Environment.Production
      : braintree.Environment.Sandbox;

  const merchantId = must("BRAINTREE_MERCHANT_ID", process.env.BRAINTREE_MERCHANT_ID);
  const publicKey = must("BRAINTREE_PUBLIC_KEY", process.env.BRAINTREE_PUBLIC_KEY);
  const privateKey = must("BRAINTREE_PRIVATE_KEY", process.env.BRAINTREE_PRIVATE_KEY);

  gateway = new braintree.BraintreeGateway({
    environment,
    merchantId,
    publicKey,
    privateKey,
  });

  return gateway;
}

/**
 * ✅ Optional helpers: keeps your route files tidy + consistent errors
 * Use these in /api/billing/braintree/subscribe and webhook routes.
 */
export function getBraintreePlanIds() {
  const standardPlanId = must(
    "BRAINTREE_PLAN_STANDARD_MONTHLY_ID",
    process.env.BRAINTREE_PLAN_STANDARD_MONTHLY_ID
  );

  // addon can be optional if you want featured upgrade optional
  const featuredAddonId = String(process.env.BRAINTREE_ADDON_FEATURED_HOME_ID || "").trim() || null;

  return { standardPlanId, featuredAddonId };
}