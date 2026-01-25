// components/ListingSidebar.js
"use client";

import Image from "next/image";

const INK = "#0e2230";
const GOLD = "#c8a44d";

export default function ListingSidebar({ listing = {} }) {
  const {
    brokerName,
    brokerCompany,
    brokerEmail,
    brokerPhone,
    brokerLogoUrl,
    contactEmail,
    locationCity,
    locationRegion,
    locationCountry,
    price,
    currency = "USD",
    title,
  } = listing ?? {};

  const email = brokerEmail || contactEmail || "";
  const logo = brokerLogoUrl || "/images/burgee.png";
  const where = [locationCity, locationRegion, locationCountry].filter(Boolean).join(", ");

  const money = (v) => {
    if (v == null) return null;
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v);
    } catch {
      return `$${Number(v).toLocaleString()}`;
    }
  };

  return (
    <aside className="lg:sticky lg:top-24 space-y-6">
      <div className="bg-white rounded-2xl p-5 ring-1 ring-black/10 shadow-sm">
        {/* header */}
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-full overflow-hidden ring-1 ring-black/10 bg-white shrink-0">
            <Image src={logo} alt="Broker logo" fill sizes="36px" className="object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-600">Listing broker</div>
            <div className="font-semibold truncate" style={{ color: INK }}>
              {brokerName || brokerCompany || "Seller"}
            </div>
            {brokerCompany && <div className="text-sm text-slate-600 truncate">{brokerCompany}</div>}
          </div>
        </div>

        {/* quick facts */}
        <div className="mt-4 grid grid-cols-1 gap-2">
          {money(price) && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Price</span>
              <span className="font-semibold" style={{ color: INK }}>
                {money(price)}
              </span>
            </div>
          )}
          {where && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Location</span>
              <span className="text-sm font-medium text-slate-800">{where}</span>
            </div>
          )}
        </div>

        {/* actions */}
        <div className="mt-4 grid grid-cols-1 gap-2">
          {email ? (
            <a
              href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
                `Inquiry about ${title || "your listing"}`
              )}`}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold !text-[#0e2230] bg-[var(--gold,#c8a44d)] shadow hover:brightness-95 transition"
            >
              Send email
            </a>
          ) : (
            <button
              disabled
              className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 bg-slate-100 cursor-not-allowed"
              title="No email available"
            >
              Send email
            </button>
          )}
          {brokerPhone && (
            <a
              href={`tel:${brokerPhone.replace(/\s+/g, "")}`}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-[#0e2230]/90 hover:bg-[#0e2230] transition"
            >
              Call broker
            </a>
          )}
        </div>

        <div className="mt-3 text-xs text-slate-500">
          We’ll share your message and contact info with the broker so they can respond.
        </div>
      </div>
    </aside>
  );
}
