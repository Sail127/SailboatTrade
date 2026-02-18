// app/checkout/[id]/page.js
import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { readSession } from "@/lib/auth";

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

function planLabel(plan) {
  return plan === "FEATURED_HOME" ? "Featured on Homepage" : "Standard Listing";
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
      plan: true,
      paymentStatus: true,
      paidAt: true,
      submittedForReviewAt: true,
      year: true,
      builder: true,
      model: true,
      title: true,
    },
  });

  if (!listing) redirect("/dashboard");
  if (listing.ownerId !== s.uid) redirect("/dashboard");

  const titleLine = titleFromListing(listing);

  // Pricing display (server-side only)
  const featuredCents = Number.parseInt(process.env.FEATURED_HOME_PRICE_USD_CENTS || "", 10);
  const standardCents = Number.parseInt(process.env.STANDARD_PRICE_USD_CENTS || "", 10);

  const featuredPrice = moneyFromCents(Number.isFinite(featuredCents) ? featuredCents : 9900);
  const standardPrice = moneyFromCents(Number.isFinite(standardCents) ? standardCents : 4900);

  const success = String(searchParams?.success || "") === "1";
  const canceled = String(searchParams?.canceled || "") === "1";

  const alreadyPaid = listing.paymentStatus === "PAID";
  const pendingReview = listing.status === "PENDING_REVIEW";

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
                Payment received. Your listing is being submitted for admin review.
              </div>
            ) : null}

            {canceled ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
                Checkout canceled. You can try again anytime.
              </div>
            ) : null}

            {alreadyPaid ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
                <div className="font-extrabold text-[#0a2230]">Already paid</div>
                <div className="mt-1">
                  Plan: <span className="font-semibold">{planLabel(listing.plan)}</span>
                  {listing.paidAt ? (
                    <span className="text-slate-500"> • Paid: {new Date(listing.paidAt).toLocaleString()}</span>
                  ) : null}
                </div>
                <div className="mt-2">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="font-semibold text-blue-700 underline underline-offset-2"
                  >
                    Return to listing
                  </Link>
                </div>
              </div>
            ) : pendingReview ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
                <div className="font-extrabold text-[#0a2230]">Submitted for review</div>
                {listing.submittedForReviewAt ? (
                  <div className="mt-1 text-slate-600">
                    Submitted: {new Date(listing.submittedForReviewAt).toLocaleString()}
                  </div>
                ) : null}
                <div className="mt-2">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="font-semibold text-blue-700 underline underline-offset-2"
                  >
                    Return to listing
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="text-[13px] text-slate-700">
                  Choose a plan, then you’ll be redirected to Stripe to complete payment.
                  After payment, your listing moves to <span className="font-semibold">PENDING_REVIEW</span> for admin approval.
                </div>

                <form action="/api/checkout" method="post" className="space-y-4">
                  <input type="hidden" name="listingId" value={listing.id} />

                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <label className="flex items-start gap-3 px-4 py-3 border-b border-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="plan"
                        value="STANDARD"
                        defaultChecked={listing.plan === "STANDARD"}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-extrabold text-[#0a2230]">
                          Standard Listing <span className="ml-2 font-extrabold text-slate-700">{standardPrice}</span>
                        </div>
                        <div className="text-[12px] text-slate-600">
                          Submit your listing for review and publishing.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
                      <input
                        type="radio"
                        name="plan"
                        value="FEATURED_HOME"
                        defaultChecked={listing.plan === "FEATURED_HOME"}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-extrabold text-[#0a2230]">
                          Featured on Homepage{" "}
                          <span className="ml-2 font-extrabold text-slate-700">{featuredPrice}</span>
                        </div>
                        <div className="text-[12px] text-slate-600">
                          Priority placement on the homepage (after admin approval).
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <Link
                      href={`/listings/new?edit=${encodeURIComponent(listing.id)}`}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
                    >
                      Edit Draft
                    </Link>

                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center rounded-full bg-[#0a2230] px-8 text-[13px] font-semibold text-white hover:bg-[#0f2a3b]"
                    >
                      Continue to Stripe
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Payments are processed securely by Stripe.
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
