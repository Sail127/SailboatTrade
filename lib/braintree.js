// lib/braintree.js
import braintree from "braintree";

function must(name, v) {
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

let gateway;

export function getBraintreeGateway() {
  if (gateway) return gateway;

  const env = (process.env.BRAINTREE_ENVIRONMENT || "sandbox").toLowerCase();

  gateway = new braintree.BraintreeGateway({
    environment:
      env === "production" ? braintree.Environment.Production : braintree.Environment.Sandbox,
    merchantId: must("BRAINTREE_MERCHANT_ID", process.env.BRAINTREE_MERCHANT_ID),
    publicKey: must("BRAINTREE_PUBLIC_KEY", process.env.BRAINTREE_PUBLIC_KEY),
    privateKey: must("BRAINTREE_PRIVATE_KEY", process.env.BRAINTREE_PRIVATE_KEY),
  });

  return gateway;
}
