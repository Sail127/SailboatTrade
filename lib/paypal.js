// lib/paypal.js
const TOKEN_EXPIRY_SKEW_MS = 30 * 1000;

let cachedAccessToken = "";
let cachedAccessTokenExpiresAt = 0;

function must(name, value) {
  const v = String(value || "").trim();
  if (!v) {
    throw new Error(`Missing ${name} (set it in .env.local / Vercel env vars)`);
  }
  return v;
}

function normalizeEnv() {
  const raw = String(process.env.PAYPAL_ENVIRONMENT || "sandbox").toLowerCase().trim();
  return raw === "production" || raw === "prod" ? "production" : "sandbox";
}

function getApiBase() {
  return normalizeEnv() === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedAccessToken && now < cachedAccessTokenExpiresAt - TOKEN_EXPIRY_SKEW_MS) {
    return cachedAccessToken;
  }

  const clientId = must("PAYPAL_CLIENT_ID", process.env.PAYPAL_CLIENT_ID);
  const clientSecret = must("PAYPAL_CLIENT_SECRET", process.env.PAYPAL_CLIENT_SECRET);
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${getApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) {
    const detail =
      data?.error_description ||
      data?.error ||
      `PayPal token request failed (${res.status})`;
    throw new Error(detail);
  }

  const expiresInSec = Number(data.expires_in || 0);
  cachedAccessToken = String(data.access_token);
  cachedAccessTokenExpiresAt = now + (Number.isFinite(expiresInSec) ? expiresInSec : 300) * 1000;
  return cachedAccessToken;
}

export function getPayPalClientIdForBrowser() {
  const fromPublic = String(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "").trim();
  if (fromPublic) return fromPublic;
  return String(process.env.PAYPAL_CLIENT_ID || "").trim();
}

export async function paypalApi(path, { method = "GET", body, headers = {} } = {}) {
  const token = await getAccessToken();
  const requestId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const res = await fetch(`${getApiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": requestId,
      ...headers,
    },
    body: body == null ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      data?.message ||
      data?.details?.[0]?.description ||
      `PayPal API request failed (${res.status})`;
    const err = new Error(detail);
    err.httpStatus = res.status;
    err.paypalData = data;
    throw err;
  }
  return data;
}

export async function createPayPalOrder(payload) {
  return paypalApi("/v2/checkout/orders", {
    method: "POST",
    body: payload,
  });
}

export async function capturePayPalOrder(orderId) {
  const id = encodeURIComponent(String(orderId || "").trim());
  if (!id) throw new Error("Missing order id.");

  return paypalApi(`/v2/checkout/orders/${id}/capture`, {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: {},
  });
}

export async function getPayPalOrder(orderId) {
  const id = encodeURIComponent(String(orderId || "").trim());
  if (!id) throw new Error("Missing order id.");
  return paypalApi(`/v2/checkout/orders/${id}`, {
    method: "GET",
  });
}

export async function listPayPalProducts({ page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    total_required: "true",
  });
  return paypalApi(`/v1/catalogs/products?${params.toString()}`, {
    method: "GET",
  });
}

export async function createPayPalProduct(payload) {
  return paypalApi("/v1/catalogs/products", {
    method: "POST",
    body: payload,
  });
}

export async function listPayPalPlans({ productId, page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    total_required: "true",
  });
  if (productId) params.set("product_id", String(productId));
  return paypalApi(`/v1/billing/plans?${params.toString()}`, {
    method: "GET",
  });
}

export async function createPayPalPlan(payload) {
  return paypalApi("/v1/billing/plans", {
    method: "POST",
    body: payload,
  });
}

export async function getPayPalSubscription(subscriptionId) {
  const id = encodeURIComponent(String(subscriptionId || "").trim());
  if (!id) throw new Error("Missing subscription id.");
  return paypalApi(`/v1/billing/subscriptions/${id}`, {
    method: "GET",
  });
}

export async function suspendPayPalSubscription(subscriptionId, reason = "Auto-renew canceled by customer.") {
  const id = encodeURIComponent(String(subscriptionId || "").trim());
  if (!id) throw new Error("Missing subscription id.");
  return paypalApi(`/v1/billing/subscriptions/${id}/suspend`, {
    method: "POST",
    body: {
      reason: String(reason || "Auto-renew canceled by customer.").trim(),
    },
  });
}

export async function verifyPayPalWebhookSignature({
  authAlgo,
  certUrl,
  transmissionId,
  transmissionSig,
  transmissionTime,
  webhookId,
  webhookEvent,
}) {
  return paypalApi("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    },
  });
}
