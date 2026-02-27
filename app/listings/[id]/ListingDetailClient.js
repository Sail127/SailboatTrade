// app/listings/[id]/ListingDetailClient.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";
const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";

// ✅ Free + paid plan constants (schema-aligned)
const FREE_PHOTO_LIMIT = 3;
const MAX_PHOTOS = 25;

/* -----------------------------
   UI primitives
------------------------------ */
function SectionCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(2,6,23,0.08)] overflow-hidden">
      <div className="px-5 py-3 bg-[#0a2230] border-b border-black/10">
        <h2 className="text-[15px] sm:text-[18px] font-extrabold tracking-wide text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-xs sm:text-sm text-white/80">{subtitle}</p>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function Badge({ children, tone = "slate" }) {
  const map = {
    slate: "border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    navy: "border-[#0a2230] bg-[#0a2230] text-white",
    gold: "border-[#c8a44d] bg-[#c8a44d] text-[#0a2230]",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold ${
        map[tone] || map.slate
      }`}
    >
      {children}
    </span>
  );
}

function Subhead({ children }) {
  return (
    <div className="text-[12px] font-extrabold tracking-wide text-slate-600">
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[12px] font-semibold text-[#0a2230]">
        {label}
      </div>
      {children}
    </label>
  );
}

function inputBase() {
  return (
    "w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-[#0a2230] " +
    "outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
  );
}

function textareaBase() {
  return (
    "w-full min-h-[120px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[13px] text-[#0a2230] " +
    "outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
  );
}

function CheckIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`inline-block ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/* -----------------------------
   Formatting helpers
------------------------------ */
function formatMoney(price, currency) {
  const n = Number(price);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString()} ${currency || ""}`.trim();
  }
}

function fmtUnit(value, unit) {
  if (value == null || value === "") return "";
  const n = Number(value);
  const shown = Number.isFinite(n) ? n : value;
  const u = String(unit || "").trim();
  return u ? `${shown} ${u}` : String(shown);
}

function prettyEnum(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  return s
    .toLowerCase()
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function prettyCondition(v) {
  const s = String(v || "").toUpperCase();
  if (s === "NEW") return "New";
  if (s === "USED") return "Used";
  return v ? prettyEnum(v) : "";
}

function prettyHullType(v) {
  const s = String(v || "").toUpperCase();
  if (s === "MONOHULL") return "Monohull";
  if (s === "CATAMARAN") return "Catamaran";
  if (s === "TRIMARAN") return "Trimaran";
  return v ? prettyEnum(v) : "";
}

function prettyFuel(v) {
  const s = String(v || "").toUpperCase();
  if (s === "DIESEL") return "Diesel";
  if (s === "GAS") return "Gas";
  return v ? prettyEnum(v) : "";
}

function isYes(v) {
  if (v === true) return true;
  const s = String(v ?? "")
    .toUpperCase()
    .trim();
  return s === "YES" || s === "TRUE" || s === "1";
}

function isUsCountry(country) {
  const c = String(country || "")
    .trim()
    .toUpperCase();
  return (
    c === "US" ||
    c === "USA" ||
    c === "U.S.A" ||
    c === "U.S.A." ||
    c === "UNITED STATES" ||
    c === "UNITED STATES OF AMERICA"
  );
}

function prettyUsCountry(country) {
  const c = String(country || "").trim();
  if (!c) return "United States of America";
  if (/united\s+states/i.test(c)) return c;
  return "United States of America";
}

function formatIntlPhoneDisplay(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const compact = s.replace(/[^\d+]/g, "");
  if (/^\+1\d{10}$/.test(compact)) {
    return `+1 (${compact.slice(2, 5)}) ${compact.slice(5, 8)}-${compact.slice(
      8
    )}`;
  }
  if (/^\+\d{7,15}$/.test(compact)) return compact;
  return s;
}

function normalizeAddressLines(rawAddr) {
  const s = String(rawAddr || "").trim();
  if (!s) return [];
  let lines = s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    const parts = s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    if (parts.length === 1) lines = [parts[0]];
    else if (parts.length === 2) lines = [parts[0], parts[1]];
    else if (parts.length === 3)
      lines = [parts[0], `${parts[1]}, ${parts[2]}`];
    else if (parts.length >= 4)
      lines = [
        parts[0],
        `${parts[1]}, ${parts[2]}`,
        parts.slice(3).join(", "),
      ];
  }

  return lines.slice(0, 4);
}

/* -----------------------------
   Status banner helper (schema-aligned)
------------------------------ */
function statusMeta(status) {
  const s = String(status || "").toUpperCase();
  switch (s) {
    case "DRAFT":
      return {
        tone: "slate",
        title: "Draft Preview",
        msg: "Only you can see this listing. Submit when ready to send for review.",
        style: "warning",
      };
    case "PENDING_REVIEW":
      return {
        tone: "navy",
        title: "Pending Review",
        msg: "Your listing is being reviewed.",
        style: "neutral",
      };
    case "REJECTED":
      return {
        tone: "red",
        title: "Changes Requested",
        msg: "Update your listing and resubmit.",
        style: "danger",
      };
    case "PUBLISHED":
      return null;
    case "ARCHIVED":
      return {
        tone: "slate",
        title: "Archived",
        msg: "This listing is not public.",
        style: "neutral",
      };
    case "REMOVED":
      return {
        tone: "red",
        title: "Removed",
        msg: "This listing is not visible publicly.",
        style: "danger",
      };
    default:
      return s
        ? { tone: "slate", title: s, msg: "Listing status.", style: "neutral" }
        : null;
  }
}

/* -----------------------------
   Upload key -> image URL
------------------------------ */
function imageUrlFromKey(key, token) {
  if (!key) return "";
  const k = String(key).trim();
  if (!k) return "";

  if (k.startsWith("data:")) return k;
  if (/^https?:\/\//i.test(k)) return k;
  if (k.startsWith("/")) return k;

  const r2 = String(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || "").replace(
    /\/+$/,
    ""
  );
  if (r2) return `${r2}/${encodeURIComponent(k)}`;

  const base = process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || "/api/uploads?key=";

  let url = base.endsWith("/")
    ? `${base}${encodeURIComponent(k)}`
    : `${base}${encodeURIComponent(k)}`;
  if (token && !/([?&])token=/.test(url)) {
    url += `${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(
      token
    )}`;
  }
  return url;
}

/* -----------------------------
   Display helpers
------------------------------ */
function BulletColumns({ items = [] }) {
  const cleaned = items.filter((x) => x && x.value);
  if (!cleaned.length)
    return <div className="text-[13px] text-slate-700">—</div>;

  return (
    <ul className="columns-1 sm:columns-2 lg:columns-3 gap-x-10">
      {cleaned.map((it) => (
        <li
          key={it.key}
          className="break-inside-avoid mb-2 text-[13px] text-slate-700"
        >
          <span className="font-extrabold text-[#0a2230]">•</span>{" "}
          <span className="font-extrabold text-[#0a2230]">{it.label}:</span>{" "}
          <span className="font-semibold">{it.value}</span>
        </li>
      ))}
    </ul>
  );
}

function InlineFacts({ items = [] }) {
  const cleaned = items.filter((x) => x && x.value);
  if (!cleaned.length)
    return <div className="text-[13px] text-slate-700">—</div>;

  return (
    <div className="flex flex-wrap text-[13px] text-slate-700">
      {cleaned.map((it, i) => (
        <div
          key={it.key}
          className={`flex items-center gap-2 ${
            i ? "ml-4 pl-4 border-l border-slate-200" : ""
          }`}
        >
          <span className="font-extrabold text-[#0a2230]">{it.label}:</span>
          <span className="font-semibold">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

/* -----------------------------
   Gallery
------------------------------ */
function Gallery({ keys = [], token = "", title = "Listing photos" }) {
  const images = useMemo(() => {
    const arr = (keys || [])
      .filter(Boolean)
      .map((k) => imageUrlFromKey(k, token));
    return arr.length ? arr : [];
  }, [keys, token]);

  const [idx, setIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const mobileTrackRef = useRef(null);

  useEffect(() => {
    if (!images.length) return;
    setIdx((v) => Math.max(0, Math.min(v, images.length - 1)));
  }, [images.length]);

  useEffect(() => {
    const el = mobileTrackRef.current;
    if (!el) return;

    function onScroll() {
      const w = el.clientWidth || 1;
      const i = Math.round(el.scrollLeft / w);
      setIdx((prev) => (i !== prev ? i : prev));
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function prev() {
    if (!images.length) return;
    setIdx((v) => (v - 1 + images.length) % images.length);
  }
  function next() {
    if (!images.length) return;
    setIdx((v) => (v + 1) % images.length);
  }

  useEffect(() => {
    const el = mobileTrackRef.current;
    if (!el) return;
    const w = el.clientWidth || 0;
    el.scrollTo({ left: idx * w, behavior: "smooth" });
  }, [idx]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const prevOverflow = document?.body?.style?.overflow;
    if (document?.body?.style) document.body.style.overflow = "hidden";

    function onKey(e) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      if (document?.body?.style)
        document.body.style.overflow = prevOverflow || "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, images.length]);

  if (!images.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-[13px] text-slate-600">
        No photos uploaded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden sm:block">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[idx]}
            alt={`${title} ${idx + 1}`}
            className="w-full aspect-[16/10] object-contain bg-slate-100 cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
            loading="eager"
          />

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 h-10 w-10 grid place-items-center hover:bg-white"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 h-10 w-10 grid place-items-center hover:bg-white"
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          ) : null}

          <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[12px] font-semibold text-white">
            {idx + 1} / {images.length}
          </div>

          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="absolute bottom-3 right-3 rounded-full border border-white/30 bg-black/60 px-3 py-1 text-[12px] font-semibold text-white hover:bg-black/70"
          >
            Fullscreen
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setIdx(i)}
              className={`relative h-16 w-24 flex-none overflow-hidden rounded-xl border ${
                i === idx ? "border-[#c8a44d]" : "border-slate-200"
              } bg-white`}
              aria-label={`View photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Thumbnail ${i + 1}`}
                className="h-full w-full object-contain bg-slate-100"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="sm:hidden">
        <div
          ref={mobileTrackRef}
          className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth rounded-2xl border border-slate-200 bg-slate-100"
        >
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              className="snap-center w-full flex-none"
              onClick={() => setLightboxOpen(true)}
              aria-label={`Open photo ${i + 1} fullscreen`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${title} ${i + 1}`}
                className="w-full aspect-[4/3] object-contain bg-slate-100"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between text-[12px] text-slate-600">
          <div>
            {idx + 1} / {images.length}
          </div>
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="font-semibold text-[#0a2230] underline underline-offset-2"
          >
            Fullscreen
          </button>
        </div>
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-3">
            <div className="text-[12px] font-semibold text-white/90">
              {idx + 1} / {images.length}
            </div>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-semibold text-white hover:bg-white/20"
              aria-label="Close"
            >
              <span className="text-lg leading-none" aria-hidden="true">
                ×
              </span>
              Close
            </button>
          </div>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={prev}
                className="hidden sm:grid absolute left-3 top-1/2 -translate-y-1/2 z-30 h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/10 text-white text-2xl hover:bg-white/15"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={next}
                className="hidden sm:grid absolute right-3 top-1/2 -translate-y-1/2 z-30 h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/10 text-white text-2xl hover:bg-white/15"
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          ) : null}

          <div className="absolute inset-0 z-10 pt-12 pb-16 px-3 sm:px-10">
            <div className="h-full w-full overflow-auto rounded-2xl bg-black/40 border border-white/10">
              <div className="min-h-full min-w-full grid place-items-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[idx]}
                  alt={`Fullscreen ${idx + 1}`}
                  className="max-w-none w-auto h-auto"
                />
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`h-14 w-20 flex-none overflow-hidden rounded-xl border ${
                    i === idx ? "border-[#c8a44d]" : "border-white/20"
                  } bg-black/30`}
                  aria-label={`Select photo ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Thumb ${i + 1}`}
                    className="h-full w-full object-contain bg-black/20"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Page
========================================================= */
export default function ListingDetailClient({
  listing,
  viewerLoggedIn,
  viewerIsOwner,
  viewerFavorited,
  canEdit,
  locationCountryLabel,
  usRegionLabel,
}) {
  const sp = useSearchParams();
  const previewToken = (sp?.get("token") || "").trim();

  const isBroker = String(listing?.sellerRole || "").toUpperCase() === "BROKER";
  const meta = statusMeta(listing?.status);

  const year = listing?.year != null ? String(listing.year) : "";
  const builder = String(listing?.builder || "").trim();
  const model = String(listing?.model || "").trim();

  const titleLine =
    [year, builder, model].filter(Boolean).join(" ") ||
    String(listing?.title || "Listing");
  const price = formatMoney(listing?.price, listing?.currency);

  const rawCountry = String(
    locationCountryLabel || listing?.locationCountry || ""
  ).trim();

  const regionCountryLine = useMemo(() => {
    const country = rawCountry || "";
    const isUSA2 = isUsCountry(country);

    const regionFallback = String(listing?.locationUsRegion || "").trim();
    const region =
      usRegionLabel || (regionFallback ? prettyEnum(regionFallback) : "");

    if (!country && region) return region;
    if (!country && !region) return "";

    if (!isUSA2) return country;

    return [region, prettyUsCountry(country)].filter(Boolean).join(" • ");
  }, [rawCountry, usRegionLabel, listing?.locationUsRegion]);

  const cityStateLine = [listing?.locationCity, listing?.locationState]
    .filter(Boolean)
    .join(", ");

  const contactName = String(listing?.listingContactName || "Seller").trim();
  const brokerageName = String(listing?.brokerageName || "").trim();

  const phoneRaw = String(listing?.contactPhone || "");
  const sellerPhoneDisplay = formatIntlPhoneDisplay(phoneRaw) || "Not provided";

  const emailRaw = String(listing?.contactEmail || "").trim();
  const sellerEmailDisplay = emailRaw || "Not provided";

  // ✅ Photo count
  const photoCount = useMemo(() => {
    const urls = Array.isArray(listing?.imageUrls)
      ? listing.imageUrls.filter(Boolean)
      : [];
    return urls.length;
  }, [listing?.imageUrls]);

  // ✅ Paid entitlement (schema-aligned)
  const photoPlan = String(listing?.photoPlan || "FREE_3").toUpperCase();
  const billingStatus = String(listing?.billingStatus || "FREE").toUpperCase();
  const hasPaidEntitlement = photoPlan === "PHOTO_PLUS_25" && billingStatus === "ACTIVE";

  const entitledMax = hasPaidEntitlement ? MAX_PHOTOS : FREE_PHOTO_LIMIT;

  const overMax = photoCount > MAX_PHOTOS;
  const requiresUpgrade = photoCount > FREE_PHOTO_LIMIT && !hasPaidEntitlement;

  const statusUpper = String(listing?.status || "").toUpperCase();
  const isDraftish = statusUpper === "DRAFT";
  const isRejected = statusUpper === "REJECTED";
  const isPending = statusUpper === "PENDING_REVIEW";

  const canSubmitFromHere = Boolean(canEdit && (isDraftish || isRejected));

  // ✅ checkout route
  const checkoutHref = useMemo(() => {
    const id = listing?.id ? encodeURIComponent(String(listing.id)) : "";
    return id ? `/checkout/${id}` : "/dashboard";
  }, [listing?.id]);

  const contactInfoLoginHref = useMemo(() => {
    const listingPath = listing?.id
      ? `/listings/${encodeURIComponent(String(listing.id))}`
      : "/listings";
    return `/login?next=${encodeURIComponent(
      listingPath
    )}&notice=contact_info_required`;
  }, [listing?.id]);

  // ✅ submit state + handler (FREE or PAID)
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  async function submitListing(mode) {
    setSubmitErr("");
    setSubmitBusy(true);
    try {
      if (overMax) {
        throw new Error(
          `You have ${photoCount} photos. Max allowed is ${MAX_PHOTOS}. Remove photos first.`
        );
      }

      const m = String(mode || "FREE").toUpperCase();

      if (m === "FREE" && photoCount > FREE_PHOTO_LIMIT) {
        throw new Error(
          `Free listings allow up to ${FREE_PHOTO_LIMIT} photos. Remove photos or upgrade.`
        );
      }

      if (m === "PAID" && !hasPaidEntitlement) {
        throw new Error("No active Photo Plus subscription found. Please upgrade first.");
      }

      const res = await fetch(
        `/api/listings/${encodeURIComponent(String(listing?.id || ""))}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: m }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not submit listing.");
      }

      window.location.assign(data.redirect || `/listings/${listing.id}`);
    } catch (e) {
      setSubmitErr(e?.message || "Could not submit listing.");
    } finally {
      setSubmitBusy(false);
    }
  }

  const [saved, setSaved] = useState(Boolean(viewerFavorited));
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setSaved(Boolean(viewerFavorited));
  }, [viewerFavorited]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    if (!shareOpen) return;

    function onKey(e) {
      if (e.key === "Escape") setShareOpen(false);
    }

    const prevOverflow = document?.body?.style?.overflow;
    if (document?.body?.style) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (document?.body?.style) document.body.style.overflow = prevOverflow || "";
    };
  }, [shareOpen]);

  function openShareDialog() {
    setShareMsg("");
    if (typeof window !== "undefined") setShareUrl(window.location.href);
    setShareOpen(true);
  }

  async function onToggleSave() {
    if (saveBusy) return;

    if (!viewerLoggedIn) {
      if (typeof window !== "undefined") {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
      }
      return;
    }

    setSaveBusy(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing?.id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not update favorites.");
      }

      const nextSaved = Boolean(data?.favorited);
      setSaved(nextSaved);
      setSaveMsg(nextSaved ? "Saved to My Favorites." : "Removed from My Favorites.");
      setTimeout(() => setSaveMsg(""), 2400);
    } catch (err) {
      setSaveMsg(err?.message || "Could not update favorites.");
      setTimeout(() => setSaveMsg(""), 2400);
    } finally {
      setSaveBusy(false);
    }
  }

  function emailShare() {
    const url = shareUrl || (typeof window !== "undefined" ? window.location.href : "");
    const subject = encodeURIComponent(`Sailboat listing: ${titleLine}`);
    const body = encodeURIComponent(
      `I thought you might be interested in this listing:\n\n${titleLine}\n${url}`
    );
    if (typeof window !== "undefined") {
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  }

  async function copyShareLink() {
    setShareMsg("");
    const url = shareUrl || (typeof window !== "undefined" ? window.location.href : "");
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setShareMsg("Link copied.");
      setTimeout(() => setShareMsg(""), 2500);
    } catch {
      setShareMsg("Couldn’t copy link.");
      setTimeout(() => setShareMsg(""), 3000);
    }
  }

  const msgRef = useRef(null);

  const defaultBuyerMsg = useMemo(
    () => `Please contact me and provide more details on this ${titleLine}.`,
    [titleLine]
  );

  const [buyerFirst, setBuyerFirst] = useState("");
  const [buyerLast, setBuyerLast] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhoneRaw, setBuyerPhoneRaw] = useState("");
  const [buyerMsg, setBuyerMsg] = useState("");

  useEffect(() => {
    setBuyerMsg((prev) => (prev && prev.trim() ? prev : defaultBuyerMsg));
  }, [defaultBuyerMsg]);

  useEffect(() => {
    if (!viewerLoggedIn) return;

    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        const u = data?.user || data?.ok?.user || null;
        if (ignore || !u) return;

        const first =
          String(u.firstName || "").trim() ||
          (u.name ? String(u.name).trim().split(" ")[0] : "");
        const last =
          String(u.lastName || "").trim() ||
          (u.name ? String(u.name).trim().split(" ").slice(1).join(" ") : "");

        if (!buyerFirst.trim() && first) setBuyerFirst(first);
        if (!buyerLast.trim() && last) setBuyerLast(last);
        if (!buyerEmail.trim() && u.email)
          setBuyerEmail(String(u.email).trim());

        // note: your /api/auth/me uses phoneE164, not "phone" — keep your old behavior harmlessly
        if (!buyerPhoneRaw.trim() && u.phone)
          setBuyerPhoneRaw(String(u.phone).trim());
      } catch {
        // ignore
      }
    })();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerLoggedIn]);

  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState("");
  const [sentErr, setSentErr] = useState("");
  const [buyerWebsite, setBuyerWebsite] = useState("");

  async function submitInquiry(e) {
    e.preventDefault();
    setSentOk("");
    setSentErr("");

    const first = buyerFirst.trim();
    const last = buyerLast.trim();
    const email = buyerEmail.trim();
    const message = buyerMsg.trim();

    if (!first || !last || !email || !message) {
      setSentErr("Please complete the required fields.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing?.id,
          name: `${first} ${last}`.trim(),
          email,
          phone: buyerPhoneRaw?.trim() ? buyerPhoneRaw.trim() : null,
          message,
          website: buyerWebsite,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error || `Request failed (${res.status})`);

      setSentOk(
        data?.message ||
          "Thank you for your interest. The seller has been notified."
      );
      setBuyerMsg(defaultBuyerMsg);
      setTimeout(() => setSentOk(""), 3000);
    } catch (err) {
      setSentErr(err?.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  const galleryKeys = useMemo(() => {
    const urls = Array.isArray(listing?.imageUrls) ? listing.imageUrls : [];
    if (urls.length) return urls;
    if (listing?.heroImageUrl) return [listing.heroImageUrl];
    return [];
  }, [listing]);

  const brokerHero = useMemo(() => {
    if (!isBroker) return "";
    const k = String(listing?.brokerHeroImageUrl || "").trim();
    return k ? imageUrlFromKey(k, previewToken) : "";
  }, [isBroker, listing?.brokerHeroImageUrl, previewToken]);

  const brokerageAddressLines = useMemo(() => {
    if (!isBroker) return [];
    return normalizeAddressLines(listing?.brokerageAddress);
  }, [isBroker, listing?.brokerageAddress]);

  const showBrokerageCard = useMemo(() => {
    if (!isBroker) return false;
    return Boolean(
      listing?.brokerageName ||
        brokerageAddressLines.length ||
        brokerHero ||
        phoneRaw ||
        emailRaw
    );
  }, [
    isBroker,
    listing?.brokerageName,
    brokerageAddressLines,
    brokerHero,
    phoneRaw,
    emailRaw,
  ]);

  const tankUnit = String(listing?.tankUnit || "").trim();
  function capWithUnit(v) {
    if (v == null || v === "") return "";
    const n = Number(v);
    const shown = Number.isFinite(n) ? n : String(v);
    return tankUnit ? `${shown} ${tankUnit}` : String(shown);
  }

  const specList = useMemo(
    () => [
      {
        key: "cond",
        label: "Condition",
        value: prettyCondition(listing?.boatCondition),
      },
      { key: "hull", label: "Hull Type", value: prettyHullType(listing?.type) },
      {
        key: "year",
        label: "Year",
        value: listing?.year != null ? String(listing.year) : "",
      },
      { key: "builder", label: "Builder", value: listing?.builder || "" },
      { key: "model", label: "Model", value: listing?.model || "" },
      {
        key: "cabins",
        label: "Cabins",
        value: listing?.cabins != null ? String(listing.cabins) : "",
      },
      {
        key: "heads",
        label: "Heads",
        value: listing?.heads != null ? String(listing.heads) : "",
      },

      {
        key: "loa",
        label: "LOA",
        value: fmtUnit(listing?.loa, listing?.loaUnit),
      },
      {
        key: "draft",
        label: "Draft",
        value: fmtUnit(listing?.draft, listing?.draftUnit),
      },
      {
        key: "air",
        label: "Air Draft",
        value: fmtUnit(listing?.airDraft, listing?.airDraftUnit),
      },

      {
        key: "disp",
        label: "Displacement",
        value: fmtUnit(listing?.displacement, listing?.displacementUnit),
      },

      {
        key: "fuelCap",
        label: "Fuel Capacity",
        value: capWithUnit(listing?.tankFuel),
      },
      {
        key: "waterCap",
        label: "Water Capacity",
        value: capWithUnit(listing?.tankWater),
      },
    ],
    [listing, tankUnit]
  );

  const engineFacts = useMemo(() => {
    const left = listing?.leftEngineHours;
    const right = listing?.rightEngineHours;
    const hrs =
      left != null || right != null
        ? [
            left != null ? `L ${left}` : null,
            right != null ? `R ${right}` : null,
          ]
            .filter(Boolean)
            .join(" • ")
        : listing?.engineHours != null
        ? String(listing.engineHours)
        : "";

    return [
      { key: "ef", label: "Fuel", value: prettyFuel(listing?.engineFuel) },
      { key: "emk", label: "Make", value: listing?.engineMake || "" },
      {
        key: "hp",
        label: "HP",
        value:
          listing?.engineHorsepower != null
            ? String(listing.engineHorsepower)
            : "",
      },
      { key: "prop", label: "Prop", value: listing?.propeller || "" },
      { key: "hrs", label: "Hours", value: hrs },
    ];
  }, [listing]);

  const equipmentSorted = useMemo(() => {
    const arr = Array.isArray(listing?.equipment)
      ? listing.equipment.filter(Boolean)
      : [];
    return arr.slice().sort((a, b) => String(a).localeCompare(String(b)));
  }, [listing?.equipment]);

  const hasGenerator = isYes(listing?.hasGenerator);
  const generatorFacts = useMemo(() => {
    if (!hasGenerator) return [];
    return [
      { key: "gf", label: "Fuel", value: prettyFuel(listing?.generatorFuel) },
      { key: "gmk", label: "Make", value: listing?.generatorMake || "" },
      {
        key: "gkw",
        label: "kW",
        value: listing?.generatorKw != null ? String(listing.generatorKw) : "",
      },
      {
        key: "gh",
        label: "Hours",
        value:
          listing?.generatorHours != null ? String(listing.generatorHours) : "",
      },
    ];
  }, [listing, hasGenerator]);

  const dinghyIncluded = isYes(listing?.hasDinghy);
  const dinghyDetails = String(listing?.dinghyDetails || "").trim();

  const riggingRemarksText = useMemo(
    () => String(listing?.riggingRemarks || "").trim(),
    [listing?.riggingRemarks]
  );

  const createdAt = listing?.createdAt ? new Date(listing.createdAt) : null;
  const updatedAt = listing?.updatedAt ? new Date(listing.updatedAt) : null;

  const dateLine = useMemo(() => {
    const a = createdAt ? createdAt.toLocaleDateString() : "";
    const b = updatedAt ? updatedAt.toLocaleDateString() : "";
    if (a && b) return `Date Added: ${a} • Last Updated: ${b}`;
    if (a) return `Date Added: ${a}`;
    if (b) return `Last Updated: ${b}`;
    return "";
  }, [listing?.createdAt, listing?.updatedAt]);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("FRAUD");
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState("");

  async function submitReport() {
    setReportMsg("");
    setReportBusy(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing?.id,
          reason: reportReason,
          details: reportDetails.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error || `Request failed (${res.status})`);
      setReportMsg("Report submitted. Thank you.");
      setTimeout(() => {
        setReportOpen(false);
        setReportMsg("");
        setReportDetails("");
        setReportReason("FRAUD");
      }, 1200);
    } catch (e) {
      setReportMsg(e?.message || "Could not submit report.");
    } finally {
      setReportBusy(false);
    }
  }

  const additionalInfoText = useMemo(
    () => String(listing?.additionalInfo || "").trim(),
    [listing?.additionalInfo]
  );

  const locationClass =
    "text-[14px] sm:text-[16px] font-semibold text-[#0a2230] font-serif tracking-wide min-w-0 truncate";

  return (
    <div className="py-8">
      <div className={CONTAINER}>
        {/* Top actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] text-slate-500" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSave}
              disabled={saveBusy}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[12px] font-semibold ${
                saved
                  ? "border-[#c8a44d] bg-[#fff7d6] text-[#0a2230]"
                  : "border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
              } ${saveBusy ? "opacity-70 cursor-not-allowed" : ""}`}
              aria-pressed={saved}
              title="Save"
            >
              <span
                aria-hidden="true"
                className="inline-block"
                style={{ transform: "scale(1.15)" }}
              >
                {saved ? "♥" : "♡"}
              </span>
              {saved ? "Saved" : "Save"}
            </button>

            <button
              type="button"
              onClick={openShareDialog}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-[12px] font-semibold text-[#0a2230] hover:bg-slate-50"
              title="Share"
            >
              ↗ Share
            </button>
          </div>
        </div>
        {saveMsg ? (
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
            {saveMsg}
          </div>
        ) : null}

        {shareOpen && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-14"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShareOpen(false);
            }}
          >
            <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <div className="text-[21px] leading-none font-semibold text-slate-700">
                  Share this listing
                </div>
                <button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[26px] leading-none text-slate-600 hover:bg-slate-100"
                  aria-label="Close share dialog"
                >
                  ×
                </button>
              </div>

              <div className="px-5 py-3 space-y-1">
                <button
                  type="button"
                  onClick={emailShare}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[15px] text-slate-700 hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M3 6h18v12H3z" />
                    <path d="M3 8l9 6 9-6" />
                  </svg>
                  <span>Email</span>
                </button>

                <button
                  type="button"
                  onClick={copyShareLink}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[15px] text-slate-700 hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 1 1 7 7L17 13" />
                    <path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 0 1-7-7L7 11" />
                  </svg>
                  <span>Copy Link</span>
                </button>

                {shareMsg ? (
                  <div className="pt-1 px-2 text-[12px] font-semibold text-emerald-700">
                    {shareMsg}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Status banner */}
        {meta ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 ${
              meta.style === "warning"
                ? "border-[#f1d58a] bg-[#fff7d6]"
                : meta.style === "danger"
                ? "border-red-200 bg-red-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={meta.tone}>{meta.title}</Badge>
                  {viewerIsOwner ? (
                    <span className="text-[12px] font-semibold text-slate-700">
                      (Owner view)
                    </span>
                  ) : null}
                  {viewerIsOwner ? (
                    <span className="text-[12px] text-slate-600">
                      • Photos:{" "}
                      <span className="font-semibold">{photoCount}</span> /{" "}
                      <span className="font-semibold">{entitledMax}</span>
                      {requiresUpgrade ? (
                        <span className="ml-2 text-[11px] text-slate-600">
                          (Upgrade needed)
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 text-[12px] text-slate-700">{meta.msg}</div>

                {submitErr ? (
                  <div className="mt-2 rounded-xl border border-red-200 bg-white/70 px-3 py-2 text-[12px] text-red-700">
                    {submitErr}
                  </div>
                ) : null}
              </div>

              {canEdit ? (
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/listings/${encodeURIComponent(
                        String(listing?.id || "")
                      )}/edit${
                        previewToken
                          ? `?token=${encodeURIComponent(previewToken)}`
                          : ""
                      }`}
                      className="inline-flex h-9 items-center justify-center rounded-full px-5 text-[12px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
                    >
                      Edit Draft
                    </a>

                    {canSubmitFromHere ? (
                      overMax ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex h-9 items-center justify-center rounded-full px-5 text-[12px] font-semibold border border-slate-200 bg-slate-200 text-slate-500 cursor-not-allowed"
                          title={`Max ${MAX_PHOTOS} photos`}
                        >
                          Too many photos
                        </button>
                      ) : requiresUpgrade ? (
                        <a
                          href={checkoutHref}
                          className="inline-flex h-9 items-center justify-center rounded-full px-5 text-[12px] font-semibold border border-[#c8a44d] bg-[#c8a44d] text-[#0a2230] hover:brightness-95"
                        >
                          Upgrade &amp; {isRejected ? "resubmit" : "submit"}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            submitListing(hasPaidEntitlement ? "PAID" : "FREE")
                          }
                          disabled={submitBusy}
                          className={`inline-flex h-9 items-center justify-center rounded-full px-5 text-[12px] font-semibold text-white ${
                            submitBusy
                              ? "bg-slate-300 cursor-not-allowed"
                              : "bg-[#0a2230] hover:bg-[#0f2a3b]"
                          }`}
                        >
                          {submitBusy
                            ? "Submitting…"
                            : isRejected
                            ? hasPaidEntitlement
                              ? "Resubmit"
                              : "Resubmit (free)"
                            : hasPaidEntitlement
                            ? "Submit"
                            : "Submit (free)"}
                        </button>
                      )
                    ) : null}
                  </div>

                  {isPending ? (
                    <div className="text-[11px] text-slate-600">
                      Editing is disabled while your listing is under review.
                    </div>
                  ) : null}

                  {canSubmitFromHere && requiresUpgrade && !overMax ? (
                    <div className="text-[11px] text-slate-600">
                      Free allows {FREE_PHOTO_LIMIT} photos. Upgrade enables up
                      to {MAX_PHOTOS}.
                    </div>
                  ) : null}

                  {canSubmitFromHere && overMax ? (
                    <div className="text-[11px] text-red-700 font-semibold">
                      Max {MAX_PHOTOS} photos. Remove photos in Edit Draft.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Top layout */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Title + gallery + location */}
          <div className="lg:col-span-8 space-y-3">
            <div className="text-[22px] sm:text-[30px] font-extrabold tracking-tight leading-tight text-[#0a2230]">
              {titleLine}
            </div>

            <Gallery keys={galleryKeys} token={previewToken} title={titleLine} />

            <div className="flex items-center justify-between gap-4">
              <div className={locationClass}>{regionCountryLine || "—"}</div>
              <div className={`${locationClass} text-right flex-none`}>
                {cityStateLine || "—"}
              </div>
            </div>
          </div>

          {/* Right: quick contact card */}
          <div className="lg:col-span-4" id="contact-card">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(2,6,23,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                {price ? (
                  <div className="text-[22px] sm:text-[24px] font-extrabold text-[#0a2230] leading-none">
                    {price}
                  </div>
                ) : null}

                <div
                  className={`${
                    price ? "mt-3" : ""
                  } text-[12px] font-extrabold tracking-wide text-slate-600`}
                >
                  For Sale by {isBroker ? "Broker" : "Owner"}
                </div>

                <div className="mt-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {isBroker ? (
                      <>
                        <div className="text-[15px] font-extrabold text-[#0a2230] truncate">
                          {brokerageName || "Brokerage"}
                        </div>
                        <div className="mt-1 text-[12px] font-semibold text-slate-700 truncate">
                          {contactName}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[15px] font-extrabold text-[#0a2230] truncate">
                          {contactName}
                        </div>
                        <div className="mt-1 text-[12px] font-semibold text-slate-700 truncate">
                          Owner
                        </div>
                      </>
                    )}

                    {viewerLoggedIn ? (
                      <>
                        <div className="mt-2 text-[12px] font-semibold text-[#0a2230]">
                          {sellerPhoneDisplay}
                        </div>

                        <div className="mt-1 text-[12px] font-semibold text-[#0a2230]">
                          {emailRaw ? (
                            <a
                              href={`mailto:${emailRaw}`}
                              className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
                            >
                              {emailRaw}
                            </a>
                          ) : (
                            sellerEmailDisplay
                          )}
                        </div>
                      </>
                    ) : (
                      <a
                        href={contactInfoLoginHref}
                        className="mt-2 inline-flex h-9 items-center justify-center rounded-full bg-[#0a2230] px-4 text-[12px] font-semibold text-white hover:bg-[#0f2a3b]"
                      >
                        Get contact info
                      </a>
                    )}
                  </div>

                  {/* ✅ Broker hero: 3:2 aspect */}
                  {isBroker && brokerHero ? (
                    <div className="w-[156px] aspect-[3/2] rounded-2xl overflow-hidden flex-none border border-slate-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={brokerHero}
                        alt="Broker hero"
                        className="h-full w-full object-contain bg-white"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="p-5">
                {sentOk ? (
                  <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
                    {sentOk}
                  </div>
                ) : null}

                {sentErr ? (
                  <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                    {sentErr}
                  </div>
                ) : null}

                <div className="text-[13px] font-extrabold text-[#0a2230]">
                  Message Seller
                </div>

                <form onSubmit={submitInquiry} className="mt-3 space-y-3">
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={buyerWebsite}
                    onChange={(e) => setBuyerWebsite(e.target.value)}
                    className="hidden"
                    aria-hidden="true"
                    name="website"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="First name *">
                      <input
                        className={inputBase()}
                        value={buyerFirst}
                        onChange={(e) => setBuyerFirst(e.target.value)}
                      />
                    </Field>
                    <Field label="Last name *">
                      <input
                        className={inputBase()}
                        value={buyerLast}
                        onChange={(e) => setBuyerLast(e.target.value)}
                      />
                    </Field>
                  </div>

                  <Field label="Email *">
                    <input
                      className={inputBase()}
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      inputMode="email"
                    />
                  </Field>

                  <div className="mt-1">
                    <label className="mb-1.5 block text-[12px] font-semibold text-[#0a2230]">
                      Phone number{" "}
                      <span className="font-normal text-slate-500">
                        (optional)
                      </span>
                    </label>

                    <div className="rounded-xl border border-slate-300 px-3 py-2 focus-within:ring-2 focus-within:ring-[#c8a44d]/40 bg-white">
                      <PhoneInput
                        defaultCountry="us"
                        value={buyerPhoneRaw}
                        onChange={(v) => setBuyerPhoneRaw(v)}
                        inputClassName="w-full !border-0 !shadow-none !outline-none !text-sm !p-0"
                        countrySelectorStyleProps={{
                          buttonClassName: "!border-0 !shadow-none",
                        }}
                      />
                    </div>
                  </div>

                  <Field label="Message *">
                    <textarea
                      ref={msgRef}
                      className={textareaBase()}
                      value={buyerMsg}
                      onChange={(e) => setBuyerMsg(e.target.value)}
                    />
                  </Field>

                  <div className="flex items-center justify-center">
                    <button
                      type="submit"
                      disabled={sending}
                      className={`inline-flex h-10 items-center justify-center rounded-full px-8 text-[13px] font-semibold text-white ${
                        sending
                          ? "bg-slate-300 cursor-not-allowed"
                          : "bg-[#0a2230] hover:bg-[#0f2a3b]"
                      }`}
                    >
                      {sending ? "Sending…" : "Send Message"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="mt-6 space-y-6">
          <SectionCard title="Description">
            <div className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">
              {listing?.description || "No description provided."}
            </div>
          </SectionCard>

          <SectionCard title="Specifications">
            <BulletColumns items={specList} />
          </SectionCard>

          <SectionCard title="Engine">
            <InlineFacts items={engineFacts} />
          </SectionCard>

          <SectionCard title="Equipment">
            <div className="space-y-6">
              <div>
                <Subhead>INSTALLED EQUIPMENT</Subhead>
                <div className="mt-3">
                  {equipmentSorted.length ? (
                    <ul className="columns-1 sm:columns-2 lg:columns-3 gap-x-10">
                      {equipmentSorted.map((name) => (
                        <li
                          key={name}
                          className="break-inside-avoid mb-2 text-[13px] text-slate-700"
                        >
                          <span className="text-emerald-600">
                            <CheckIcon className="h-[18px] w-[18px] -translate-y-[1px]" />
                          </span>{" "}
                          <span className="font-semibold">{name}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-[13px] text-slate-700">
                      No equipment listed.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Subhead>
                  <span className="inline-flex items-center gap-2">
                    {hasGenerator ? (
                      <span className="text-emerald-600">
                        <CheckIcon className="h-[18px] w-[18px] -translate-y-[1px]" />
                      </span>
                    ) : null}
                    GENERATOR
                  </span>
                </Subhead>
                <div className="mt-2">
                  {hasGenerator ? (
                    <InlineFacts items={generatorFacts} />
                  ) : (
                    <div className="text-[13px] text-slate-700">
                      No generator listed.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Subhead>
                  <span className="inline-flex items-center gap-2">
                    {dinghyIncluded ? (
                      <span className="text-emerald-600">
                        <CheckIcon className="h-[18px] w-[18px] -translate-y-[1px]" />
                      </span>
                    ) : null}
                    DINGHY
                  </span>
                </Subhead>
                <div className="mt-2 text-[13px] text-slate-700">
                  <span className="font-semibold">
                    {dinghyIncluded ? "Included" : "No"}
                  </span>
                  {dinghyIncluded && dinghyDetails ? (
                    <div className="mt-1 whitespace-pre-wrap">
                      {dinghyDetails}
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <Subhead>RIGGING / SAIL INVENTORY REMARKS</Subhead>
                <div className="mt-2 text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {riggingRemarksText ||
                    "No rigging / sail inventory remarks provided."}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Additional Information">
            <div className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">
              {additionalInfoText || "No additional information provided."}
            </div>
          </SectionCard>

          {showBrokerageCard ? (
            <SectionCard title="Brokerage">
              <div className="flex flex-col items-center text-center">
                {brokerHero ? (
                  <div className="w-full max-w-[360px] rounded-2xl overflow-hidden border border-slate-200 bg-white">
                    <div className="aspect-[3/2] bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={brokerHero}
                        alt="Brokerage hero"
                        className="h-full w-full object-contain bg-white"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-2 text-[14px] font-extrabold text-[#0a2230]">
                  {listing?.brokerageName || "Brokerage"}
                </div>

                {brokerageAddressLines.length ? (
                  <div className="mt-1 text-[12px] text-slate-600 space-y-0.5">
                    {brokerageAddressLines.map((ln, i) => (
                      <div key={ln + i} className="leading-snug">
                        {ln}
                      </div>
                    ))}
                  </div>
                ) : null}

                {viewerLoggedIn ? (
                  <>
                    <div className="mt-2 text-[12px] font-semibold text-[#0a2230]">
                      {sellerPhoneDisplay}
                    </div>
                    <div className="mt-1 text-[12px] font-semibold text-[#0a2230]">
                      {emailRaw ? (
                        <a
                          href={`mailto:${emailRaw}`}
                          className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
                        >
                          {emailRaw}
                        </a>
                      ) : (
                        sellerEmailDisplay
                      )}
                    </div>
                  </>
                ) : (
                  <a
                    href={contactInfoLoginHref}
                    className="mt-2 inline-flex h-9 items-center justify-center rounded-full bg-[#0a2230] px-4 text-[12px] font-semibold text-white hover:bg-[#0f2a3b]"
                  >
                    Get contact info
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("contact-card");
                    if (el)
                      el.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    setTimeout(() => {
                      if (msgRef.current) msgRef.current.focus();
                    }, 250);
                  }}
                  className="mt-2 text-[12px] font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                >
                  Contact Broker
                </button>
              </div>
            </SectionCard>
          ) : null}
        </div>

        {/* Bottom meta + report */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[12px] text-slate-600">
          {dateLine ? <div>{dateLine}</div> : null}
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="text-[12px] font-semibold text-red-600 hover:text-red-700 underline underline-offset-2"
          >
            Report Ad
          </button>
        </div>

        {reportOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setReportOpen(false);
            }}
          >
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-[#0a2230]">
                <div className="text-[14px] font-semibold text-white">
                  Report this listing
                </div>
              </div>
              <div className="p-5 space-y-3">
                <Field label="Reason">
                  <select
                    className={inputBase()}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                  >
                    <option value="FRAUD">Suspected fraud / scam</option>
                    <option value="WRONG_INFO">Wrong information</option>
                    <option value="DUPLICATE">Duplicate listing</option>
                    <option value="OFFENSIVE">Offensive content</option>
                    <option value="OTHER">Other</option>
                  </select>
                </Field>

                <Field label="Details (optional)">
                  <textarea
                    className={textareaBase()}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Tell us what’s wrong…"
                  />
                </Field>

                {reportMsg ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
                    {reportMsg}
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
                    onClick={() => setReportOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={reportBusy}
                    className={`inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold text-white ${
                      reportBusy
                        ? "bg-slate-300 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                    onClick={submitReport}
                  >
                    {reportBusy ? "Submitting…" : "Submit Report"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="h-10" />
      </div>
    </div>
  );
}
