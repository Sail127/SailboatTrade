// components/ListingSidebar.js
const INK = "#0a2230";
const GOLD = "#c8a44d";

function money(value, currency) {
  if (value == null || value === "") return null;
  const cur = String(currency || "USD");
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(Number(value));
  } catch {
    return `${Number(value).toLocaleString()} ${cur}`;
  }
}

function roleLabel(v) {
  if (!v) return "";
  const s = String(v).toUpperCase();
  if (s === "OWNER") return "Owner";
  if (s === "BROKER") return "Broker";
  return String(v);
}

function buildUploadsUrl(key, previewToken = null) {
  // Avoid any environment quirks: build query manually
  const k = encodeURIComponent(String(key || "").trim());
  if (!k) return null;

  const t = previewToken ? encodeURIComponent(String(previewToken).trim()) : "";
  return t ? `/api/uploads?key=${k}&token=${t}` : `/api/uploads?key=${k}`;
}

function resolveMediaSrc(v, previewToken = null) {
  const s = String(v || "").trim();
  if (!s) return null;

  // already a URL
  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // local/public file
  if (s.startsWith("/")) return s;

  // treat as R2 key via gated endpoint
  return buildUploadsUrl(s, previewToken);
}

function normalizeTel(raw) {
  // keep + and digits only
  const s = String(raw || "").trim();
  if (!s) return "";
  const cleaned = s.replace(/[^\d+]/g, "");
  return cleaned || s;
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M6.5 3.5l3.2 2.2-1.2 2.9c1.2 2.3 3.1 4.2 5.4 5.4l2.9-1.2 2.2 3.2c.4.6.2 1.4-.4 1.8-1.2.8-2.6 1.2-4.1 1.2-6 0-10.9-4.9-10.9-10.9 0-1.5.4-2.9 1.2-4.1.4-.6 1.2-.8 1.8-.4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function ListingSidebar({ listing = {} }) {
  const {
    price,
    currency,

    sellerRole,
    listingContactName,
    contactEmail,
    contactPhone,

    brokerageName,
    brokerageAddress,
    brokerLogoUrl,

    equipment,

    __previewToken,
  } = listing ?? {};

  const priceText = money(price, currency);
  const equipCount = Array.isArray(equipment) ? equipment.filter(Boolean).length : 0;

  const logoSrc = resolveMediaSrc(brokerLogoUrl, __previewToken || null);
  const tel = normalizeTel(contactPhone);

  return (
    <div className="space-y-4">
      {/* Price card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold text-slate-500">Asking Price</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight" style={{ color: INK }}>
              {priceText || "Contact for price"}
            </div>
          </div>

          <div
            className="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold shrink-0"
            style={{ backgroundColor: `${GOLD}22`, color: INK }}
          >
            {roleLabel(sellerRole) || "Seller"}
          </div>
        </div>

        <div className="mt-4 h-px bg-slate-200" />

        <div className="mt-4 flex items-center justify-between">
          <div className="text-[13px] text-slate-600">
            {equipCount ? `${equipCount} equipment item(s)` : "Equipment not listed"}
          </div>
          <div className="text-[12px] font-semibold text-slate-500">
            {currency ? String(currency).toUpperCase() : "USD"}
          </div>
        </div>
      </div>

      {/* Contact card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-slate-500">Listing Contact</div>

            <div className="mt-2 text-[15px] font-semibold truncate" style={{ color: INK }}>
              {listingContactName || "—"}
            </div>

            {sellerRole === "BROKER" && (brokerageName || brokerageAddress) ? (
              <div className="mt-2 text-[13px] text-slate-700 whitespace-pre-wrap">
                {brokerageName ? <div className="font-semibold">{brokerageName}</div> : null}
                {brokerageAddress ? <div>{brokerageAddress}</div> : null}
              </div>
            ) : null}
          </div>

          {logoSrc ? (
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt="Broker logo"
                className="h-14 w-auto rounded-xl border border-slate-200 bg-white object-contain px-2"
                loading="lazy"
                onError={(e) => {
                  // hide broken logos cleanly (drafts often have missing/invalid keys)
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          {contactEmail ? (
            <a
              href={`mailto:${contactEmail}`}
              className="group block w-full rounded-xl bg-[#0a2230] px-4 py-3 text-center text-[13px] font-semibold text-white hover:bg-[#0f2a3b] transition"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <MailIcon />
                Email seller
              </span>
            </a>
          ) : (
            <div className="text-[13px] text-slate-600">Email not provided.</div>
          )}

          {tel ? (
            <a
              href={`tel:${tel}`}
              className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50 transition"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <PhoneIcon />
                Call {contactPhone}
              </span>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
