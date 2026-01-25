// app/why-list/page.js
import Link from "next/link";

export const metadata = {
  title: "Why list with SailboatTrade.com?",
  description:
    "Four clear reasons sellers and advertisers choose SailboatTrade.com: fair by design, sailboat-only focus, coffee-fund fees, and a community-first mission.",
};

export default function WhyListPage() {
  const reasons = [
    {
      title: "Fair by design",
      body:
        "We’re neutral—built to serve buyers, private sellers, and brokers equally. Results are relevance-first, not pay-to-win.",
    },
    {
      title: "Sailboat-only. Laser-focused.",
      body:
        "No powerboat noise. We obsess over findability so your listing (or ad) shows up for the right sailors, fast.",
    },
    {
      title: "Coffee-fund fees",
      body:
        "Transparent and low—just enough to keep the lights on. No commissions. No surprises. Advertisers get honest value.",
    },
    {
      title: "We do this for the love of sailing",
      body:
        "We’re not chasing a quick buck. We’re building the world’s best sailboat marketplace because it should exist—and it should be affordable.",
    },
  ];

  // Consistent CTA pills (matches listings filter CTA vibe)
  const ctaPrimary =
    "inline-flex items-center justify-center h-10 rounded-full px-5 " +
    "text-sm md:text-base font-semibold " +
    "bg-[#0a2230] border border-[#0a2230] shadow-sm " +
    "!text-white hover:!text-white [&_*]:!text-white " +
    "hover:bg-[#0f2a3b] hover:border-[#0f2a3b] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a44d]/50 transition";

  const ctaSecondary =
    "inline-flex items-center justify-center h-10 rounded-full px-5 " +
    "text-sm md:text-base font-semibold " +
    "bg-white border border-slate-300 shadow-sm text-[#0a2230] " +
    "hover:bg-slate-50 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a44d]/40 transition";

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-4xl px-5 md:px-8 pt-10 md:pt-12 pb-14">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#0a2230]">
          Why list with{" "}
          <span className="text-[#0a2230]">Sailboat</span>
          <span className="text-[#c8a44d]">Trade</span>
          <span className="text-slate-500">.com</span>?
        </h1>

        <p className="mt-3 text-base md:text-lg text-slate-600">
          Four simple reasons sellers and advertisers choose SailboatTrade.
        </p>

        {/* Reasons */}
        <ol className="mt-7 space-y-4">
          {reasons.map((r, i) => (
            <li
              key={i}
              className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c8a44d] text-[#0a2230] font-extrabold leading-none"
                aria-hidden="true"
              >
                {i + 1}
              </span>

              <div className="min-w-0">
                <h2 className="text-lg md:text-xl font-semibold text-[#0a2230] leading-tight">
                  {r.title}
                </h2>
                <p className="mt-1 text-sm md:text-base leading-relaxed text-slate-600">
                  {r.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/listings/new" className={ctaPrimary}>
            List a boat for sale
          </Link>
          <Link href="/advertise" className={ctaSecondary}>
            Advertise
          </Link>
        </div>
      </section>
    </main>
  );
}
