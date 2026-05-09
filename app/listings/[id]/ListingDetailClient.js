// app/listings/[id]/ListingDetailClient.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { isDialCodeOnlyPhone } from "@/lib/phone";

const NAVY = "#0a2230";
const GOLD = "#c8a44d";
const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";

// ✅ Free + paid plan constants (schema-aligned)
const FREE_PHOTO_LIMIT = 3;
const MAX_PHOTOS = 25;
const SWIPE_OFFSET_THRESHOLD = 28;
const SWIPE_VELOCITY_THRESHOLD = 220;
const SLIDE_TRANSITION = {
  type: "tween",
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1],
};

const gallerySlideVariants = {
  enter: (dir) => ({
    x: dir > 0 ? "100%" : "-100%",
  }),
  center: {
    x: "0%",
  },
  exit: (dir) => ({
    x: dir > 0 ? "-100%" : "100%",
  }),
};

function shouldSwipe(offsetX, velocityX) {
  return (
    Math.abs(offsetX) > SWIPE_OFFSET_THRESHOLD ||
    Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD
  );
}

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
          <p className="mt-1 text-xs sm:text-sm font-medium text-white/95">{subtitle}</p>
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
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
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
    case "SOLD":
      return {
        tone: "emerald",
        title: "Sold",
        msg: "This listing is no longer public.",
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
  const [slideDirection, setSlideDirection] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [lightboxViewportHeight, setLightboxViewportHeight] = useState(null);
  const [lightboxViewportWidth, setLightboxViewportWidth] = useState(null);
  const [touchLandscapeFit, setTouchLandscapeFit] = useState(null);
  const mobileTrackRef = useRef(null);
  const galleryDragRef = useRef(false);
  const pinchAreaRef = useRef(null);
  const lightboxImageRef = useRef(null);
  const wheelStateRef = useRef({ lastTs: 0, acc: 0 });
  const pointersRef = useRef(new Map());
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const pinchStateRef = useRef({
    startDistance: 0,
    startZoom: 1,
    startPanX: 0,
    startPanY: 0,
    startX: 0,
    startY: 0,
    swipeEligible: false,
  });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function clampPan(nextX, nextY, nextZoom = zoomRef.current) {
    const el = pinchAreaRef.current;
    if (!el || nextZoom <= 1.001) return { x: 0, y: 0 };
    const cw = Number(el.clientWidth || 0);
    const ch = Number(el.clientHeight || 0);
    const baseW =
      isTouchLandscape && touchLandscapeFit?.w
        ? Number(touchLandscapeFit.w)
        : cw;
    const baseH =
      isTouchLandscape && touchLandscapeFit?.h
        ? Number(touchLandscapeFit.h)
        : ch;
    const maxX = Math.max(0, (baseW * nextZoom - cw) / 2);
    const maxY = Math.max(0, (baseH * nextZoom - ch) / 2);
    return {
      x: clamp(nextX, -maxX, maxX),
      y: clamp(nextY, -maxY, maxY),
    };
  }

  function resetZoom() {
    pointersRef.current.clear();
    pinchStateRef.current.swipeEligible = false;
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function updateTouchLandscapeFit() {
    const wrap = pinchAreaRef.current;
    const img = lightboxImageRef.current;
    if (!wrap || !img) return;

    const cw = Number(wrap.clientWidth || 0);
    const ch = Number(wrap.clientHeight || 0);
    const nw = Number(img.naturalWidth || 0);
    const nh = Number(img.naturalHeight || 0);
    if (!cw || !ch || !nw || !nh) return;

    const scale = Math.min(cw / nw, ch / nh);
    const w = Math.max(1, Math.floor(nw * scale));
    const h = Math.max(1, Math.floor(nh * scale));
    setTouchLandscapeFit({ w, h });
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const updateTouchMode = () => {
      setIsTouchDevice(Boolean(mq.matches || navigator.maxTouchPoints > 0));
    };
    updateTouchMode();
    if (mq.addEventListener) mq.addEventListener("change", updateTouchMode);
    else mq.addListener(updateTouchMode);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", updateTouchMode);
      else mq.removeListener(updateTouchMode);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(orientation: landscape)");
    const updateOrientation = () => setIsLandscape(Boolean(mq.matches));
    updateOrientation();
    if (mq.addEventListener) mq.addEventListener("change", updateOrientation);
    else mq.addListener(updateOrientation);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", updateOrientation);
      else mq.removeListener(updateOrientation);
    };
  }, []);

  useEffect(() => {
    if (!images.length) return;
    setIdx((v) => Math.max(0, Math.min(v, images.length - 1)));
  }, [images.length]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    if (!lightboxOpen) return;
    resetZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, idx]);

  useEffect(() => {
    if (!lightboxOpen) return;

    function onViewportChange() {
      // Rotation/resize can leave stale zoom/pan bounds; recenter to fit.
      resetZoom();
      requestAnimationFrame(() => requestAnimationFrame(resetZoom));
    }

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen || !isTouchDevice || typeof window === "undefined")
      return;

    const vv = window.visualViewport;
    const readHeight = () => {
      const h = vv?.height || window.innerHeight || 0;
      const w = vv?.width || window.innerWidth || 0;
      setLightboxViewportHeight(h > 0 ? Math.round(h) : null);
      setLightboxViewportWidth(w > 0 ? Math.round(w) : null);
    };

    readHeight();
    vv?.addEventListener?.("resize", readHeight);
    vv?.addEventListener?.("scroll", readHeight);
    window.addEventListener("resize", readHeight);

    return () => {
      vv?.removeEventListener?.("resize", readHeight);
      vv?.removeEventListener?.("scroll", readHeight);
      window.removeEventListener("resize", readHeight);
      setLightboxViewportHeight(null);
      setLightboxViewportWidth(null);
    };
  }, [lightboxOpen, isTouchDevice]);

  useEffect(() => {
    const el = mobileTrackRef.current;
    if (!el) return;

    function onScroll() {
      if (lightboxOpen) return;
      const w = el.clientWidth || 1;
      const i = Math.round(el.scrollLeft / w);
      setIdx((prev) => (i !== prev ? i : prev));
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [lightboxOpen]);

  function prev() {
    if (!images.length) return;
    setSlideDirection(-1);
    setIdx((v) => (v - 1 + images.length) % images.length);
  }
  function next() {
    if (!images.length) return;
    setSlideDirection(1);
    setIdx((v) => (v + 1) % images.length);
  }

  useEffect(() => {
    if (lightboxOpen) return;
    const el = mobileTrackRef.current;
    if (!el) return;
    const w = el.clientWidth || 0;
    if (w <= 0) return;
    el.scrollTo({ left: idx * w, behavior: "auto" });
  }, [lightboxOpen]);

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

  function onZoomPointerDown(e) {
    if (!lightboxOpen) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const el = pinchAreaRef.current;
    if (!el) return;
    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size >= 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      pinchStateRef.current.startDistance = Math.max(1, distance(a, b));
      pinchStateRef.current.startZoom = zoomRef.current;
      pinchStateRef.current.startPanX = panRef.current.x;
      pinchStateRef.current.startPanY = panRef.current.y;
      pinchStateRef.current.swipeEligible = false;
      return;
    }

    pinchStateRef.current.startX = e.clientX;
    pinchStateRef.current.startY = e.clientY;
    pinchStateRef.current.startPanX = panRef.current.x;
    pinchStateRef.current.startPanY = panRef.current.y;
    pinchStateRef.current.swipeEligible =
      zoomRef.current <= 1.001 && images.length > 1;
  }

  function onZoomPointerMove(e) {
    if (!lightboxOpen) return;
    if (!pointersRef.current.has(e.pointerId)) return;

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size >= 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      const startDistance = Math.max(1, pinchStateRef.current.startDistance || 1);
      const nextDistance = Math.max(1, distance(a, b));
      const nextZoom = clamp(
        (pinchStateRef.current.startZoom || 1) * (nextDistance / startDistance),
        1,
        4
      );
      const nextPan = clampPan(
        pinchStateRef.current.startPanX || 0,
        pinchStateRef.current.startPanY || 0,
        nextZoom
      );
      setZoom(nextZoom);
      setPan(nextPan);
      pinchStateRef.current.swipeEligible = false;
      e.preventDefault();
      return;
    }

    if (zoomRef.current <= 1.001) return;

    const dx = e.clientX - (pinchStateRef.current.startX || e.clientX);
    const dy = e.clientY - (pinchStateRef.current.startY || e.clientY);
    const nextPan = clampPan(
      (pinchStateRef.current.startPanX || 0) + dx,
      (pinchStateRef.current.startPanY || 0) + dy,
      zoomRef.current
    );
    setPan(nextPan);
    e.preventDefault();
  }

  function onZoomPointerUp(e) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size === 1) {
      const [last] = Array.from(pointersRef.current.values());
      pinchStateRef.current.startX = last.x;
      pinchStateRef.current.startY = last.y;
      pinchStateRef.current.startPanX = panRef.current.x;
      pinchStateRef.current.startPanY = panRef.current.y;
      pinchStateRef.current.startZoom = zoomRef.current;
      pinchStateRef.current.startDistance = 0;
      return;
    }

    if (pointersRef.current.size === 0 && zoomRef.current <= 1.001) {
      setPan({ x: 0, y: 0 });
      const dx = e.clientX - (pinchStateRef.current.startX || e.clientX);
      const dy = e.clientY - (pinchStateRef.current.startY || e.clientY);
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const isSwipe =
        pinchStateRef.current.swipeEligible && absX > 24 && absX > absY * 1.05;
      if (isSwipe) {
        if (dx < 0) next();
        else prev();
      }
      pinchStateRef.current.swipeEligible = false;
    }
  }

  function onLightboxWheel(e) {
    if (!lightboxOpen || images.length <= 1 || isTouchDevice) return;
    if (zoomRef.current > 1.001) return;

    const primaryDelta =
      Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!Number.isFinite(primaryDelta) || primaryDelta === 0) return;

    e.preventDefault();

    const now = Date.now();
    const state = wheelStateRef.current;
    if (now - state.lastTs > 220) state.acc = 0;
    state.lastTs = now;
    state.acc += primaryDelta;

    if (Math.abs(state.acc) < 60) return;
    if (state.acc > 0) next();
    else prev();
    state.acc = 0;
  }

  const isTouchLandscape =
    isTouchDevice &&
    ((lightboxViewportWidth != null &&
      lightboxViewportHeight != null &&
      lightboxViewportWidth > lightboxViewportHeight) ||
      isLandscape);
  const showTouchThumbs = isTouchDevice ? !isTouchLandscape : true;
  const showThumbStrip = images.length > 1 && showTouchThumbs;
  const showTopRow = !isTouchLandscape;

  useEffect(() => {
    if (!lightboxOpen) {
      setTouchLandscapeFit(null);
      return;
    }
    if (!isTouchLandscape) {
      setTouchLandscapeFit(null);
      return;
    }

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        updateTouchLandscapeFit();
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lightboxOpen,
    isTouchLandscape,
    idx,
    lightboxViewportHeight,
    lightboxViewportWidth,
  ]);

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
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
            <AnimatePresence initial={false} custom={slideDirection} mode="sync">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img
                key={`gallery-main-${idx}`}
                src={images[idx]}
                alt={`${title} ${idx + 1}`}
                className="absolute inset-0 h-full w-full object-contain bg-slate-100 cursor-zoom-in"
                loading="eager"
                custom={slideDirection}
                variants={gallerySlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={SLIDE_TRANSITION}
                style={{ willChange: "transform" }}
                drag={images.length > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.16}
                dragMomentum={false}
                onDrag={(_, info) => {
                  if (Math.abs(info.offset.x) > 6) galleryDragRef.current = true;
                }}
                onDragEnd={(_, info) => {
                  const offsetX = info.offset.x || 0;
                  const velocityX = info.velocity.x || 0;
                  if (shouldSwipe(offsetX, velocityX)) {
                    if (offsetX < 0 || velocityX < 0) next();
                    else prev();
                  }
                  requestAnimationFrame(() => {
                    galleryDragRef.current = false;
                  });
                }}
                onClick={() => {
                  if (galleryDragRef.current) return;
                  setLightboxOpen(true);
                }}
              />
            </AnimatePresence>
          </div>

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
              onClick={() => {
                if (i === idx) return;
                setSlideDirection(i > idx ? 1 : -1);
                setIdx(i);
              }}
              className={`relative h-16 w-24 flex-none overflow-hidden rounded-xl border ${
                i === idx
                  ? "border-[#c8a44d] ring-2 ring-[#c8a44d]/70 ring-offset-1 ring-offset-white shadow-[0_0_0_1px_rgba(10,34,48,0.18)]"
                  : "border-slate-200"
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
          className="flex w-full overflow-x-auto snap-x snap-mandatory rounded-2xl border border-slate-200 bg-slate-100"
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
                loading={i < 3 ? "eager" : "lazy"}
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
          className="fixed inset-0 z-50 bg-black"
          style={
            isTouchDevice && lightboxViewportHeight
              ? { height: `${lightboxViewportHeight}px` }
              : undefined
          }
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          {isTouchDevice ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute z-40 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg leading-none text-white hover:bg-white/20"
              style={{
                top: "calc(env(safe-area-inset-top, 0px) + 0.35rem)",
                right: "calc(env(safe-area-inset-right, 0px) + 0.5rem)",
              }}
              aria-label="Close"
            >
              ×
            </button>
          ) : null}

          {isTouchLandscape ? (
            <div
              className="absolute z-40 rounded-full bg-black/45 px-3 py-1 text-[12px] font-semibold text-white"
              style={{
                top: "calc(env(safe-area-inset-top, 0px) + 0.45rem)",
                left: "calc(env(safe-area-inset-left, 0px) + 0.5rem)",
              }}
            >
              {idx + 1} / {images.length}
            </div>
          ) : null}

          <div
            className="grid h-full w-full"
            style={
              isTouchDevice
                ? {
                    gridTemplateRows: showTopRow
                      ? showThumbStrip
                        ? "auto minmax(0,1fr) auto"
                        : "auto minmax(0,1fr)"
                      : "minmax(0,1fr)",
                    paddingTop: isTouchLandscape
                      ? "0px"
                      : "calc(env(safe-area-inset-top, 0px) + 0.25rem)",
                    paddingRight: "calc(env(safe-area-inset-right, 0px) + 0.5rem)",
                    paddingBottom: isTouchLandscape
                      ? "0px"
                      : "calc(env(safe-area-inset-bottom, 0px) + 0.25rem)",
                    paddingLeft: "calc(env(safe-area-inset-left, 0px) + 0.5rem)",
                  }
                : {
                    gridTemplateRows: showTopRow
                      ? showThumbStrip
                        ? "auto minmax(0,1fr) auto"
                        : "auto minmax(0,1fr)"
                      : "minmax(0,1fr)",
                  }
            }
          >
            {showTopRow ? (
              <div className="z-30 flex items-center justify-between px-2 py-2 sm:px-4">
                <div className="text-[12px] font-semibold text-white/90">
                  {idx + 1} / {images.length}
                </div>
                {!isTouchDevice ? (
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
                ) : (
                  <span className="h-9 w-9" aria-hidden="true" />
                )}
              </div>
            ) : null}

            <div
              className={`relative z-10 min-h-0 ${
                isTouchLandscape ? "px-0" : "px-0 sm:px-10"
              }`}
            >
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-40 h-12 w-12 place-items-center rounded-full border border-white/35 bg-black/55 text-white text-2xl shadow-[0_10px_24px_rgba(0,0,0,0.45)] hover:bg-black/70 hidden sm:grid"
                    aria-label="Previous photo"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-40 h-12 w-12 place-items-center rounded-full border border-white/35 bg-black/55 text-white text-2xl shadow-[0_10px_24px_rgba(0,0,0,0.45)] hover:bg-black/70 hidden sm:grid"
                    aria-label="Next photo"
                  >
                    ›
                  </button>
                </>
              ) : null}

              <div
                ref={pinchAreaRef}
                className={`h-full w-full overflow-hidden ${
                  isTouchDevice ? "" : "rounded-2xl border border-white/10 bg-black/40"
                }`}
                style={{ touchAction: "none" }}
                onWheel={onLightboxWheel}
                onPointerDown={onZoomPointerDown}
                onPointerMove={onZoomPointerMove}
                onPointerUp={onZoomPointerUp}
                onPointerCancel={onZoomPointerUp}
                onDoubleClick={() => {
                  if (zoom > 1.001) resetZoom();
                  else setZoom(2);
                }}
              >
                <div className="relative h-full w-full overflow-hidden">
                  <AnimatePresence initial={false} custom={slideDirection} mode="sync">
                    <motion.div
                      key={`gallery-lightbox-${idx}`}
                      className="absolute inset-0 flex items-center justify-center"
                      custom={slideDirection}
                      variants={gallerySlideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={SLIDE_TRANSITION}
                      style={{ willChange: "transform" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        ref={lightboxImageRef}
                        src={images[idx]}
                        alt={`Fullscreen ${idx + 1}`}
                        className={`${
                          isTouchLandscape
                            ? "h-auto w-auto max-h-full max-w-full object-contain"
                            : "max-h-full max-w-full h-auto w-auto object-contain"
                        } select-none`}
                        draggable={false}
                        onLoad={() => {
                          if (isTouchLandscape) updateTouchLandscapeFit();
                        }}
                        style={{
                          width:
                            isTouchLandscape && touchLandscapeFit?.w
                              ? `${touchLandscapeFit.w}px`
                              : undefined,
                          height:
                            isTouchLandscape && touchLandscapeFit?.h
                              ? `${touchLandscapeFit.h}px`
                              : undefined,
                          transform:
                            zoom > 1.001
                              ? `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`
                              : "translate3d(0, 0, 0) scale(1)",
                          transformOrigin: "center center",
                        }}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {showThumbStrip ? (
              <div
                className={`z-30 ${
                  isTouchDevice ? "px-2 pt-1 pb-1" : "px-4 pt-2 pb-3"
                }`}
              >
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((src, i) => (
                    <button
                      key={src + i}
                      type="button"
                      onClick={() => {
                        if (i === idx) return;
                        setSlideDirection(i > idx ? 1 : -1);
                        setIdx(i);
                      }}
                      className={`${
                        isTouchDevice ? "h-9 w-12" : "h-14 w-20"
                      } flex-none overflow-hidden rounded-xl border ${
                        i === idx
                          ? "border-[#f3c969] ring-2 ring-[#f3c969]/90 ring-offset-1 ring-offset-black shadow-[0_0_0_1px_rgba(243,201,105,0.7)]"
                          : "border-white/20"
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
            ) : null}
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
  forcedPreviewToken = "",
}) {
  const sp = useSearchParams();
  const previewToken = String(
    forcedPreviewToken || (sp?.get("token") || "")
  ).trim();
  const returnTo = String(sp?.get("returnTo") || "").trim();
  const safeReturnTo = returnTo.startsWith("/listings") ? returnTo : "/listings";

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

  const locationRegionText = useMemo(() => {
    const country = rawCountry || "";
    const isUSA2 = isUsCountry(country);
    const regionFallback = String(listing?.locationUsRegion || "").trim();
    const region =
      usRegionLabel || (regionFallback ? prettyEnum(regionFallback) : "");

    if (!country && region) return region;
    if (!country || !isUSA2) return "";
    return region;
  }, [rawCountry, usRegionLabel, listing?.locationUsRegion]);

  const locationCountryText = useMemo(() => {
    const country = rawCountry || "";
    if (!country) return "";
    return isUsCountry(country) ? prettyUsCountry(country) : country;
  }, [rawCountry]);

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

  function onPrintListing() {
    if (typeof window !== "undefined") window.print();
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

  const desktopMsgRef = useRef(null);
  const mobileMsgRef = useRef(null);

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
    const buyerPhone = String(buyerPhoneRaw || "").trim();

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
          phone:
            buyerPhone && !isDialCodeOnlyPhone(buyerPhone) ? buyerPhone : null,
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
    } catch (err) {
      setSentErr(err?.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  function renderMessageSellerForm(textareaRef) {
    return (
      <>
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
              <span className="font-normal text-slate-500">(optional)</span>
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
              ref={textareaRef}
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
      </>
    );
  }

  function focusMessageSellerForm() {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches;

    const scrollTarget = isMobile
      ? document.getElementById("contact-form-mobile")
      : document.getElementById("contact-card");

    if (scrollTarget) {
      scrollTarget.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    setTimeout(() => {
      const targetRef = isMobile ? mobileMsgRef : desktopMsgRef;
      if (targetRef.current) targetRef.current.focus();
    }, 250);
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

  const currencyCode = String(listing?.currency || "")
    .trim()
    .toUpperCase();
  const priceWithCurrency = price
    ? `${price}${currencyCode ? ` ${currencyCode}` : ""}`
    : "";

  const titleClass = "text-[24px] sm:text-[34px] font-bold leading-tight tracking-tight text-[#0a2230]";
  const priceClass = "text-[18px] sm:text-[22px] font-normal leading-tight text-[#0a2230]";
  const locationClass = "text-[15px] sm:text-[18px] font-medium text-[#0a2230] min-w-0 truncate";

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
              className={`inline-flex h-9 w-9 items-center justify-center cursor-pointer text-[#0a2230] ${
                saveBusy ? "opacity-70 cursor-not-allowed" : "hover:text-[#133549]"
              }`}
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved" : "Save listing"}
              title="Save"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[26px] w-[26px]"
                fill={saved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20.6C7.5 16.4 4 13.4 4 9.4A4.4 4.4 0 0 1 8.4 5c1.5 0 2.9.7 3.8 1.9A4.7 4.7 0 0 1 16 5a4.4 4.4 0 0 1 4.4 4.4c0 4-3.5 7-8.4 11.2z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={openShareDialog}
              className="inline-flex h-9 w-9 items-center justify-center cursor-pointer text-[#0a2230] hover:text-[#133549]"
              aria-label="Share listing"
              title="Share"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[26px] w-[26px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v11" />
                <path d="M8.5 6.5L12 3l3.5 3.5" />
                <path d="M5 10.5v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onPrintListing}
              className="inline-flex h-9 w-9 items-center justify-center cursor-pointer text-[#0a2230] hover:text-[#133549]"
              aria-label="Print listing"
              title="Print"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[26px] w-[26px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 8V4h10v4" />
                <rect x="5" y="9" width="14" height="8" rx="2" />
                <path d="M7 14h10v6H7z" />
              </svg>
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
          {/* Left: Title + gallery + location + price */}
          <div className="lg:col-span-8 space-y-3">
            <a
              href={safeReturnTo}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
            >
              <span aria-hidden="true" className="text-base leading-none">
                ←
              </span>
              Return to Search
            </a>

            <h1 className={titleClass}>{titleLine}</h1>

            <Gallery keys={galleryKeys} token={previewToken} title={titleLine} />

            <div className="flex items-center justify-between gap-4">
              <div className={locationClass}>
                {locationRegionText || locationCountryText ? (
                  <>
                    {locationRegionText ? <span>{locationRegionText}</span> : null}
                    {locationRegionText && locationCountryText ? (
                      <span> • </span>
                    ) : null}
                    {locationCountryText ? (
                      <span className="font-bold">{locationCountryText}</span>
                    ) : null}
                  </>
                ) : (
                  "—"
                )}
              </div>
              <div className={`${locationClass} text-right flex-none`}>
                {cityStateLine || "—"}
              </div>
            </div>

            {priceWithCurrency ? <div className={priceClass}>{priceWithCurrency}</div> : null}
          </div>

          {/* Right: quick contact card */}
          <div className="lg:col-span-4 lg:mt-10" id="contact-card">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(2,6,23,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <div
                  className="text-[12px] font-extrabold tracking-wide text-slate-600"
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

              <div className="hidden p-5 lg:block">
                {renderMessageSellerForm(desktopMsgRef)}
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
            <div
              id="contact-form-mobile"
              className="lg:hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(2,6,23,0.06)] p-5"
            >
              {renderMessageSellerForm(mobileMsgRef)}
            </div>
          ) : null}

          {showBrokerageCard ? (
            <SectionCard title="Brokerage">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {brokerHero ? (
                  <div className="shrink-0 sm:w-[132px]">
                    <div className="aspect-[3/2] w-full">
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

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="text-[14px] font-extrabold text-[#0a2230]">
                    {listing?.brokerageName || "Brokerage"}
                  </div>

                  {brokerageAddressLines.length ? (
                    <div className="mt-1 space-y-0.5 text-[12px] text-slate-600">
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
                </div>
              </div>
            </SectionCard>
          ) : null}

          {!showBrokerageCard ? (
            <div
              id="contact-form-mobile"
              className="lg:hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(2,6,23,0.06)] p-5"
            >
              {renderMessageSellerForm(mobileMsgRef)}
            </div>
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
