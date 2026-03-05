// app/why-list/page.js
import Link from "next/link";
import BrandWordmark from "@/components/BrandWordmark";

export const metadata = {
  title: "Why List with ST.com? | SailboatTrade.com",
  description:
    "Four clear reasons owners and brokers choose SailboatTrade.com: fair visibility, sailboat-only focus, straightforward pricing, and a community-first mission.",
};

export default function WhyListPage() {
  const reasons = [
    {
      title: "It is absolutely free to list!",
      body:
        "Our mission is to make sailing accessible to everyone. Private sellers and brokers start on equal footing wtih maximum transparency for all.",
    },
    {
      title: "Sailboat-only, buyer-intent focused",
      body:
        "No powerboat clutter. Your listing is shown to people already looking specifically for sailboats.",
    },
    {
      title: "Straightforward, low-cost pricing",
      body:
        "Transparent fees with no commissions and no surprise add-ons. The model is built to stay affordable.",
    },
    {
      title: "Built by sailors, improving continuously",
      body:
        "SailboatTrade is purpose-built for this niche, and we keep refining the experience based on real user feedback.",
    },
  ];

  // Consistent CTA pills (matches site navy/gold system)
  const ctaPrimary =
    "inline-flex items-center justify-center h-10 rounded-full px-5 " +
    "text-sm md:text-base font-semibold " +
    "bg-[#c8a44d] border border-[#c8a44d] shadow-sm text-[#0a2230] " +
    "hover:bg-[#b9933f] hover:border-[#b9933f] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a44d]/50 transition";

  const ctaSecondary =
    "inline-flex items-center justify-center h-10 rounded-full px-5 " +
    "text-sm md:text-base font-semibold " +
    "bg-white border border-slate-300 shadow-sm text-[#0a2230] " +
    "hover:bg-slate-50 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a44d]/40 transition";

  return (
    <main className="min-h-[70vh] bg-white">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {/* Title */}
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-[#0a2230]"
          style={{ fontFamily: "var(--font-brand, inherit)", letterSpacing: "0.02em" }}
        >
          Why List with{" "}
          <BrandWordmark
            tone="light"
            className="text-[1em] leading-none align-baseline"
          />
          <span className="text-[#0a2230]">?</span>
        </h1>

        <p className="mt-3 max-w-3xl text-[15px] sm:text-[16px] text-slate-700">
          Four simple reasons owners and brokers choose SailboatTrade when it is time to list.
        </p>

        {/* Reasons */}
        <ol className="mt-7 space-y-4">
          {reasons.map((r, i) => (
            <li
              key={i}
              className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-[0_10px_28px_rgba(2,6,23,0.06)]"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c8a44d] text-[#0a2230] font-extrabold leading-none"
                aria-hidden="true"
              >
                {i + 1}
              </span>

              <div className="min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-[#0a2230] leading-tight">
                  {r.title}
                </h2>
                <p className="mt-1 text-sm md:text-base leading-relaxed text-slate-700">
                  {r.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/listings/new" className={ctaPrimary}>
            Start Your Listing
          </Link>
          <Link href="/contact" className={ctaSecondary}>
            Talk to Support
          </Link>
        </div>
      </section>
    </main>
  );
}
