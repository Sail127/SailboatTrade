// app/contact/page.js
export const metadata = {
  title: "Contact | SailboatTrade.com",
  description:
    "Contact SailboatTrade.com support. We welcome feedback to help improve the website.",
};

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

export default function Page() {
  return (
    <main className="min-h-[70vh] bg-white">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {/* Simple header (no big hero block) */}
        <div className="mb-8">
          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight"
            style={{ color: NAVY }}
          >
            Contact SailboatTrade
          </h1>
          <p className="mt-2 text-[15px] sm:text-[16px] text-slate-700 max-w-2xl">
            Need help with a listing or your account? Email us anytime. We also
            love feedback—your suggestions help shape future improvements.
          </p>
        </div>

        {/* Content grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contact card */}
          <section className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_10px_28px_rgba(2,6,23,0.06)]">
            <h2 className="text-xl font-extrabold" style={{ color: NAVY }}>
              Support email
            </h2>

            <p className="mt-2 text-slate-700 text-[14px] leading-relaxed">
              The fastest way to reach us is by email. If you’re reporting an
              issue, please include the listing link (if applicable), what you
              clicked, and any screenshots.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                Email
              </div>

              <a
                href="mailto:support@sailboattrade.com"
                className="mt-1 inline-flex items-center gap-2 text-[16px] font-extrabold underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500"
                style={{ color: NAVY }}
              >
                support@SailboatTrade.com
              </a>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <a
                  href="mailto:support@sailboattrade.com"
                  className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-[14px] font-bold text-white shadow-sm transition hover:brightness-105 active:brightness-95"
                  style={{ backgroundColor: NAVY }}
                >
                  Email Support
                </a>

                <a
                  href="mailto:support@sailboattrade.com?subject=SailboatTrade%20Feedback"
                  className="inline-flex items-center justify-center rounded-xl border px-5 py-3 text-[14px] font-bold transition hover:bg-slate-50"
                  style={{ borderColor: GOLD, color: NAVY }}
                >
                  Send Website Feedback
                </a>
              </div>

              <div className="mt-3 text-[12px] text-slate-600">
                Tip: Put “Bug” or “Feedback” in the subject line to help us triage faster.
              </div>
            </div>

            <h3 className="mt-7 text-[15px] font-extrabold" style={{ color: NAVY }}>
              What we can help with
            </h3>

            <ul className="mt-3 space-y-2 text-[14px] text-slate-700">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: GOLD }} />
                Account login, registration, and password issues
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: GOLD }} />
                Creating, editing, or publishing listings
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: GOLD }} />
                Problems with photos, uploads, or listing details
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: GOLD }} />
                Suggestions for new features and improvements
              </li>
            </ul>
          </section>

          {/* Feedback card */}
          <aside className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_10px_28px_rgba(2,6,23,0.06)]">
            <h2 className="text-xl font-extrabold" style={{ color: NAVY }}>
              We want your feedback
            </h2>

            <p className="mt-2 text-[14px] text-slate-700 leading-relaxed">
              SailboatTrade.com is built to be a better, sailboat-only marketplace.
              If you have ideas that would improve the experience for buyers, owners,
              or brokers, we’d genuinely love to hear them.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                Helpful feedback includes
              </div>
              <ul className="mt-3 space-y-2 text-[13px] text-slate-700">
                <li>• What you were trying to do</li>
                <li>• What felt confusing or slow</li>
                <li>• What feature you’d like next</li>
              </ul>
            </div>

            <a
              href="mailto:support@sailboattrade.com?subject=SailboatTrade%20Feedback"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-[14px] font-extrabold shadow-sm transition hover:brightness-105 active:brightness-95"
              style={{ backgroundColor: GOLD, color: NAVY }}
            >
              Send Feedback
            </a>

            <p className="mt-3 text-[12px] text-slate-600">
              Thanks for helping shape the future of SailboatTrade.
            </p>
          </aside>
        </div>

        <div className="mt-10 text-center text-[12px] text-slate-500">
          © {new Date().getFullYear()} SailboatTrade.com — Built by Sailors – For Sailors
        </div>
      </div>
    </main>
  );
}
