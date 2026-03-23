import {
  createPayPalPlan,
  createPayPalProduct,
  listPayPalPlans,
  listPayPalProducts,
} from "@/lib/paypal";
import { dollarsFromCents } from "@/lib/paypalCheckout";

const PRODUCT_NAME = "SailboatTrade Listing Upgrades";
const PRODUCT_DESCRIPTION = "Recurring paid upgrades for SailboatTrade listings.";

function normalizeText(value) {
  return String(value || "").trim();
}

function addonLabel({ photoPlus, featuredHome }) {
  const parts = [];
  if (photoPlus) parts.push("Photo Plus");
  if (featuredHome) parts.push("Featured Home");
  return parts.join(" + ") || "Listing Upgrade";
}

function buildPlanName({ photoPlus, featuredHome, termMonths, totalCents }) {
  return `SBT ${addonLabel({ photoPlus, featuredHome })} ${termMonths}M ${dollarsFromCents(totalCents)}`;
}

async function ensureProduct() {
  const envProductId = normalizeText(process.env.PAYPAL_SUBSCRIPTIONS_PRODUCT_ID);
  if (envProductId) return envProductId;

  const existing = await listPayPalProducts({ page: 1, pageSize: 20 }).catch(() => null);
  const match = Array.isArray(existing?.products)
    ? existing.products.find((product) => normalizeText(product?.name) === PRODUCT_NAME)
    : null;
  if (match?.id) return match.id;

  const created = await createPayPalProduct({
    name: PRODUCT_NAME,
    description: PRODUCT_DESCRIPTION,
    type: "SERVICE",
    category: "SOFTWARE",
    home_url: String(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim() || undefined,
  });
  if (!created?.id) throw new Error("PayPal product creation failed.");
  return created.id;
}

export async function ensurePayPalSubscriptionPlan({
  photoPlus,
  featuredHome,
  termMonths,
  totalCents,
  currency = "USD",
}) {
  const productId = await ensureProduct();
  const name = buildPlanName({ photoPlus, featuredHome, termMonths, totalCents });
  const existing = await listPayPalPlans({ productId, page: 1, pageSize: 20 }).catch(() => null);
  const match = Array.isArray(existing?.plans)
    ? existing.plans.find((plan) => normalizeText(plan?.name) === name)
    : null;
  if (match?.id) {
    return { productId, planId: match.id, planName: name };
  }

  const created = await createPayPalPlan({
    product_id: productId,
    name,
    description: `Auto-renewing ${addonLabel({ photoPlus, featuredHome })} every ${termMonths} month${termMonths === 1 ? "" : "s"}.`,
    status: "ACTIVE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: termMonths,
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: dollarsFromCents(totalCents),
            currency_code: String(currency || "USD").toUpperCase(),
          },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      payment_failure_threshold: 1,
    },
  });

  if (!created?.id) throw new Error("PayPal plan creation failed.");
  return { productId, planId: created.id, planName: name };
}
