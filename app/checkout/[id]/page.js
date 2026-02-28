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
      billingProvider: true,
      billingCurrentPeriodEnd: true,
      billingTermMonths: true,
    },
  });

  if (!listing) redirect("/dashboard");
  if (listing.ownerId !== s.uid) redirect("/dashboard");

  const titleLine = titleFromListing(listing);

  const photoCount = Array.isArray(listing.imageUrls) ? listing.imageUrls.length : 0;

  // ✅ constants (keep in sync with schema rules)
  const freePhotoLimit = 3;
  const maxPhotos = 25;

  // ✅ prices from env (Featured defaults to $7/month)
  const photoPlusCents = Number.parseInt(process.env.PHOTO_PLUS_25_PRICE_USD_CENTS || "700", 10);
  const featuredCents = Number.parseInt(process.env.FEATURED_HOME_PRICE_USD_CENTS || "700", 10);

  const photoPlusPrice = moneyFromCents(Number.isFinite(photoPlusCents) ? photoPlusCents : 700);
  const featuredPrice = moneyFromCents(Number.isFinite(featuredCents) ? featuredCents : 700);
  const paypalClientId = String(
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || ""
  ).trim();

  const success = String(searchParams?.success || "") === "1";
  const canceled = String(searchParams?.canceled || "") === "1";
  const showConfirmation = success;

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
            {showConfirmation ? (
              <>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                  <div className="text-[12px] font-extrabold tracking-wide text-emerald-800">
                    Purchase Complete
                  </div>
                  <div className="mt-1 text-[20px] font-extrabold text-[#0a2230]">
                    Thank you for your purchase
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-[14px] text-slate-700 space-y-2">
                  <div>Your payment information has been received.</div>
                  <div>
                    Your listing is pending review and will be published within 48 hours if it meets community guidelines.
                  </div>
                  <div>
                    If it does not meet community guidelines, the listing will be returned to draft so it can be edited and resubmitted.
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#0a2230] px-5 text-[13px] font-semibold text-white hover:bg-[#0f2a3b]"
                  >
                    View listing
                  </Link>
                  <Link
                    href="/dashboard/listings"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
                  >
                    Go to dashboard
                  </Link>
                </div>
              </>
            ) : (
              <>
                {canceled ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
                    Checkout canceled. You can try again anytime.
                  </div>
                ) : null}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
                  <div className="font-extrabold text-[#0a2230]">Listing workflow</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Create or edit your listing in draft, then submit for admin review. Once approved, the listing goes live.</li>
                    <li>
                      Free listings stay active for <span className="font-semibold">30 days</span>. Paid upgrades run for
                      <span className="font-semibold"> 1, 3, or 6 months</span> depending on your selected term.
                    </li>
                    <li>
                      When a listing expires, it moves to archived (not public). Renew from your dashboard: free renewals use the Renew action, paid renewals continue through checkout.
                    </li>
                  </ul>
                </div>

                <CheckoutUI
                  listingId={listing.id}
                  titleLine={titleLine}
                  paypalClientId={paypalClientId}
                  photoCount={photoCount}
                  freePhotoLimit={freePhotoLimit}
                  maxPhotos={maxPhotos}
                  photoPlusPrice={photoPlusPrice}
                  featuredPrice={featuredPrice}
                  photoPlusCents={Number.isFinite(photoPlusCents) ? photoPlusCents : 700}
                  featuredCents={Number.isFinite(featuredCents) ? featuredCents : 700}
                  initialPhotoPlan={listing.photoPlan}
                  initialFeaturedHome={Boolean(listing.featuredHome)}
                  billingStatus={String(listing.billingStatus || "")}
                  billingProvider={String(listing.billingProvider || "")}
                  currentPeriodEnd={listing.billingCurrentPeriodEnd ? listing.billingCurrentPeriodEnd.toISOString() : ""}
                  initialTermMonths={listing.billingTermMonths || 1}
                />
              </>
            )}
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
