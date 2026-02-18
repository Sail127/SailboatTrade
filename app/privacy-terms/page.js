// app/privacy/page.js
// (If your route is different, keep the same content but move this file accordingly.)

export const metadata = {
  title: "Privacy & Terms | SailboatTrade.com",
  description:
    "Privacy Policy and Terms of Service for SailboatTrade.com, a sailboat marketplace for buyers, owners, and brokers.",
};

const NAVY = "#0a2230";
const GOLD = "#c8a44d";

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: NAVY }}>
        {title}
      </h2>
      <div className="mt-3 text-[14px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

function SmallList({ items }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <span className="mt-2 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: GOLD }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  const lastUpdated = "February 2026"; // <-- update anytime you make changes

  return (
    <main className="min-h-[70vh] bg-white">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: NAVY }}>
            Privacy & Terms
          </h1>
          <p className="mt-2 text-[15px] text-slate-700 max-w-3xl">
            This page explains how SailboatTrade.com handles information and outlines the rules for
            using our marketplace. If you have questions, contact{" "}
            <a
              href="mailto:support@sailboattrade.com"
              className="font-bold underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500"
              style={{ color: NAVY }}
            >
              support@SailboatTrade.com
            </a>
            .
          </p>
          <div className="mt-3 text-[12px] text-slate-500">Last updated: {lastUpdated}</div>
        </div>

        {/* Quick links */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">
            Quick links
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ["privacy", "Privacy Policy"],
              ["terms", "Terms of Service"],
              ["contact", "Contact"],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-white/70"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6">
          {/* PRIVACY */}
          <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-8 shadow-[0_10px_28px_rgba(2,6,23,0.06)]">
            <Section id="privacy" title="Privacy Policy">
              <p>
                SailboatTrade.com is a sailboat-focused listing marketplace. We collect only what we
                need to operate the site, keep it secure, and help buyers and sellers connect.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Information we collect
              </h3>
              <SmallList
                items={[
                  "Account information: name, email, and login credentials (stored securely).",
                  "Listing information you submit: boat details, photos, location, and contact preferences.",
                  "Communications: messages or emails you send to support or through any contact forms.",
                  "Usage data: basic logs and analytics to improve performance, security, and usability.",
                ]}
              />

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                How we use information
              </h3>
              <SmallList
                items={[
                  "Provide and maintain the website and marketplace features.",
                  "Create and manage accounts, listings, favorites, alerts, and other user features.",
                  "Respond to support requests and send important service notices.",
                  "Prevent fraud, abuse, and unauthorized access; enforce policies.",
                  "Improve the site based on user feedback and usage patterns.",
                ]}
              />

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Cookies and analytics
              </h3>
              <p className="mt-2">
                We may use cookies or similar technologies to keep you signed in, remember
                preferences, and understand how the site is used. You can control cookies through
                your browser settings, but some site features may not work correctly without them.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Sharing of information
              </h3>
              <p className="mt-2">
                We do not sell your personal information. We may share information only in the
                following situations:
              </p>
              <SmallList
                items={[
                  "Service providers: vendors that help us run the site (hosting, storage, email delivery, analytics, payment processing, customer support). They may access data only to perform services for us.",
                  "Legal and safety: to comply with law, respond to lawful requests, or protect the rights, safety, and security of users and the platform.",
                  "Business changes: if we’re involved in a merger, acquisition, or asset sale, information may be transferred as part of that transaction.",
                ]}
              />

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Public listing content
              </h3>
              <p className="mt-2">
                Listings you publish may be visible to the public and may appear in search engines.
                Be thoughtful about what you include. If you choose to display contact details in a
                listing, you’re choosing to make that information available to viewers.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Data retention and security
              </h3>
              <p className="mt-2">
                We retain information as long as needed to provide the service, meet legal
                obligations, resolve disputes, and enforce agreements. We use reasonable safeguards
                to protect data, but no method of transmission or storage is 100% secure.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Your choices and rights
              </h3>
              <SmallList
                items={[
                  "Access/update: you can update many account details in your dashboard.",
                  "Deletion: you may request deletion of your account by contacting support.",
                  "Marketing: if we ever send optional marketing emails, you can unsubscribe at any time.",
                  "Regional rights: depending on where you live, you may have additional privacy rights (e.g., access, deletion, correction, portability).",
                ]}
              />

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Children
              </h3>
              <p className="mt-2">
                SailboatTrade.com is not intended for children under 13, and we do not knowingly
                collect personal information from children.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Changes to this policy
              </h3>
              <p className="mt-2">
                We may update this Privacy Policy from time to time. The “Last updated” date above
                reflects the most recent changes.
              </p>
            </Section>
          </div>

          {/* TERMS */}
          <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-8 shadow-[0_10px_28px_rgba(2,6,23,0.06)]">
            <Section id="terms" title="Terms of Service">
              <p>
                These Terms govern your use of SailboatTrade.com (the “Service”). By accessing or
                using the Service, you agree to these Terms.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Marketplace disclaimer
              </h3>
              <p className="mt-2">
                SailboatTrade.com is a listing platform that helps buyers and sellers connect. We
                are not a broker, dealer, escrow agent, marine surveyor, or insurer, and we are not
                a party to any transaction between users. Buyers and sellers are solely responsible
                for due diligence, inspections, contracts, payments, and compliance with applicable
                laws.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Eligibility and accounts
              </h3>
              <SmallList
                items={[
                  "You must be at least 18 years old to create an account and list a boat.",
                  "You are responsible for maintaining the confidentiality of your login credentials.",
                  "You agree to provide accurate information and keep your account information updated.",
                ]}
              />

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Listings and user content
              </h3>
              <SmallList
                items={[
                  "You are responsible for the accuracy and legality of your listings and any content you post (text, photos, specs, location, pricing).",
                  "Do not post misleading information, stolen photos, or content you don’t have rights to use.",
                  "We may remove or edit content that violates these Terms or harms users or the platform.",
                  "By posting content, you grant SailboatTrade.com a non-exclusive, worldwide, royalty-free license to host, store, reproduce, and display it to operate and promote the Service (e.g., showing your listing on the site and in marketing).",
                ]}
              />

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Prohibited activities
              </h3>
              <SmallList
                items={[
                  "Fraud, deception, or impersonation of any person or organization.",
                  "Posting illegal content or facilitating illegal transactions.",
                  "Scraping, harvesting, or collecting data from the site without permission.",
                  "Attempting to bypass security features or interfere with the Service.",
                  "Sending spam, unsolicited offers, or abusive communications to other users.",
                ]}
              />

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Fees, paid services, and payments
              </h3>
              <p className="mt-2">
                Some features may be free and others may require payment (for example, paid listing
                upgrades or promotional placement). If paid services are offered, prices and any
                related terms will be shown at checkout. Payment processing may be handled by
                third-party providers, and their terms may apply.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Third-party links and services
              </h3>
              <p className="mt-2">
                The Service may include links to third-party websites or services. We do not control
                and are not responsible for third-party content, policies, or practices.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Warranty disclaimer
              </h3>
              <p className="mt-2">
                The Service is provided “as is” and “as available.” We make no warranties of any
                kind, express or implied, including merchantability, fitness for a particular
                purpose, or non-infringement. We do not guarantee that listings are accurate, that
                boats are seaworthy, or that transactions will be completed.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Limitation of liability
              </h3>
              <p className="mt-2">
                To the maximum extent permitted by law, SailboatTrade.com and its operators will not
                be liable for indirect, incidental, special, consequential, or punitive damages, or
                any loss of profits, data, or goodwill, arising from your use of the Service or any
                user-to-user transaction.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Indemnification
              </h3>
              <p className="mt-2">
                You agree to indemnify and hold harmless SailboatTrade.com from claims, damages,
                liabilities, and expenses arising out of your content, your use of the Service, or
                your violation of these Terms.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Termination
              </h3>
              <p className="mt-2">
                We may suspend or terminate access to the Service at any time if we believe you
                violated these Terms or posed a risk to the platform or other users. You may stop
                using the Service at any time.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Governing law
              </h3>
              <p className="mt-2">
                These Terms are governed by the laws of the jurisdiction where SailboatTrade.com’s
                operating entity is organized, without regard to conflict of law principles.
              </p>

              <h3 className="mt-6 text-[15px] font-extrabold" style={{ color: NAVY }}>
                Changes to these Terms
              </h3>
              <p className="mt-2">
                We may update these Terms from time to time. Continued use of the Service after
                changes become effective means you accept the updated Terms.
              </p>
            </Section>
          </div>

          {/* CONTACT */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7 sm:p-8">
            <Section id="contact" title="Contact">
              <p>
                Questions about privacy, terms, listings, or the site? Email us at{" "}
                <a
                  href="mailto:support@sailboattrade.com"
                  className="font-bold underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500"
                  style={{ color: NAVY }}
                >
                  support@SailboatTrade.com
                </a>
                .
              </p>
            </Section>
          </div>
        </div>

        <div className="mt-10 text-center text-[12px] text-slate-500">
          © {new Date().getFullYear()} SailboatTrade.com — Built by Sailors – For Sailors
        </div>
      </div>
    </main>
  );
}
