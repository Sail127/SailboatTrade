// app/checkout/[id]/page.js
import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";
import CheckoutUI from "./ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function moneyFromCents(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n / 100);
}

function titleFromListing(listing) {
  const year = listing?.year != null ? String(listing.year) : "";
  const builder = String(listing?.builder || "").trim();
  const model = String(listing?.model || "").trim();
  const fallback = String(listing?.title || "Listing").trim();
  return [year, builder, model].filter(Boolean).join(" ") || fallback;
}

export default async function CheckoutPage({ params, searchParams }) {
  const id = String(params?.id || "").trim();
  if (!id) redirect("/");

  const s = await readSession();
  if (!s?.uid) redirect(`/login?next=${encodeURIComponent(`/checkout/${id}`)}`);

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      status: true,
      previewToken: true,

      year: true,
      builder: true,
      model: true,
      title: true,

      heroImageUrl: true,
      imageUrls: true,

      // ✅ new plan fields
      photoPlan: true,
      featuredHome: true,

      billingStatus: true,
      billingAddons: true,
      braintreeSubscriptionId: true,
      billingCurrentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  if (!listing) redirect("/dashboard");
  if (listing.ownerId !== s.uid) redirect("/dashboard");

  const titleLine = titleFromListing(listing);

  const photoCount = Array.isArray(listing.imageUrls) ? listing.imageUrls.length : 0;

  // ✅ constants (keep in sync with schema rules)
  const freePhotoLimit = 3;
  const maxPhotos = 25;

  // ✅ prices ($5 each by default)
  const photoPlusCents = Number.parseInt(process.env.PHOTO_PLUS_25_PRICE_USD_CENTS || "500", 10);
  const featuredCents = Number.parseInt(process.env.FEATURED_HOME_PRICE_USD_CENTS || "500", 10);

  const photoPlusPrice = moneyFromCents(Number.isFinite(photoPlusCents) ? photoPlusCents : 500);
  const featuredPrice = moneyFromCents(Number.isFinite(featuredCents) ? featuredCents : 500);

  const success = String(searchParams?.success || "") === "1";
  const canceled = String(searchParams?.canceled || "") === "1";

  const hasSubscription = Boolean(listing.braintreeSubscriptionId);

  return (
    <div className="py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href={`/listings/${listing.id}`} className="text-sm font-semibold text-slate-600 hover:text-slate-800">
            ← Back to listing
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_rgba(2,6,23,0.08)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200">
            <div className="text-[12px] font-extrabold tracking-wide text-slate-600">Checkout</div>
            <div className="mt-2 text-[20px] sm:text-[24px] font-extrabold text-[#0a2230] leading-tight">
              {titleLine}
            </div>
            <div className="mt-2 text-[12px] text-slate-600">
              Listing ID: <span className="font-semibold">{listing.id}</span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
                Subscription started. Your listing has been submitted for review.
              </div>
            ) : null}

            {canceled ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
                Checkout canceled. You can try again anytime.
              </div>
            ) : null}

            <CheckoutUI
              listingId={listing.id}
              titleLine={titleLine}
              photoCount={photoCount}
              freePhotoLimit={freePhotoLimit}
              maxPhotos={maxPhotos}
              photoPlusPrice={photoPlusPrice}
              featuredPrice={featuredPrice}
              initialPhotoPlan={listing.photoPlan}
              initialFeaturedHome={Boolean(listing.featuredHome)}
              billingStatus={String(listing.billingStatus || "")}
              hasSubscription={hasSubscription}
              cancelAtPeriodEnd={Boolean(listing.cancelAtPeriodEnd)}
              currentPeriodEnd={listing.billingCurrentPeriodEnd ? listing.billingCurrentPeriodEnd.toISOString() : ""}
            />
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}