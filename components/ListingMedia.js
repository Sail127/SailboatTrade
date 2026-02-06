// components/ListingMedia.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const INK = "#0a2230";
const GOLD = "#c8a44d";
const FALLBACK = "/boats/example-sailboat1.jpg";

/**
 * SafeImg
 * - Client-only <img> with automatic fallback on load errors
 * - IMPORTANT: Never pass event handlers from Server Components into <img>
 *   (but this file is client, so it's fine)
 */
/* eslint-disable @next/next/no-img-element */
function SafeImg({ src, alt, className = "", loading = "lazy", draggable, onClick, style }) {
  const [cur, setCur] = useState(src || FALLBACK);

  useEffect(() => {
    setCur(src || FALLBACK);
  }, [src]);

  return (
    <img
      src={cur || FALLBACK}
      alt={alt || ""}
      className={className}
      loading={loading}
      draggable={draggable}
      style={style}
      onClick={onClick}
      onError={() => {
        if (cur !== FALLBACK) setCur(FALLBACK);
      }}
    />
  );
}
/* eslint-enable @next/next/no-img-element */

export default function ListingMedia({ images = [], title = "Gallery", previewToken = null }) {
  const pics = useMemo(() => {
    const arr = Array.isArray(images) ? images.filter(Boolean) : [];

    const resolve = (v) => {
      const s = String(v).trim();
      if (!s) return null;

      // already a URL
      if (s.startsWith("http://") || s.startsWith("https://")) return s;
      // local public asset
      if (s.startsWith("/")) return s;

      // R2 key -> signed URL endpoint
      const qp = new URLSearchParams({ key: s });
      if (previewToken) qp.set("token", String(previewToken));
      return `/api/uploads?${qp.toString()}`;
    };

    const resolved = arr.map(resolve).filter(Boolean);
    // de-dupe
    return resolved.filter((v, i, a) => a.indexOf(v) === i);
  }, [images, previewToken]);

  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (active >= pics.length) setActive(0);
  }, [pics.length, active]);

  const next = () => setActive((a) => (pics.length ? (a + 1) % pics.length : 0));
  const prev = () => setActive((a) => (pics.length ? (a - 1 + pics.length) % pics.length : 0));

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pics.length]);

  const dragRef = useRef({ x: null, y: null });
  const begin = (x, y) => (dragRef.current = { x, y });
  const end = (x, y) => {
    const { x: sx, y: sy } = dragRef.current;
    if (sx == null) return;
    const dx = x - sx;
    const dy = y - sy;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      dx < 0 ? next() : prev();
    }
    dragRef.current = { x: null, y: null };
  };

  const mainSrc = pics[active] || FALLBACK;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Main image */}
      <div className="group relative bg-slate-50">
        <SafeImg
          src={mainSrc}
          alt={title}
          className="w-full h-[46vh] md:h-[56vh] object-cover cursor-zoom-in"
          loading="eager"
          onClick={() => setOpen(true)}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Counter */}
        <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold shadow-sm">
          <span style={{ color: INK }}>
            {Math.min(active + 1, Math.max(pics.length, 1))} / {Math.max(pics.length, 1)}
          </span>
        </div>

        {/* Arrows */}
        {pics.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="
                absolute left-3 top-1/2 -translate-y-1/2
                h-10 w-10 rounded-full
                bg-black/45 text-white backdrop-blur-sm
                opacity-0 group-hover:opacity-100 transition
                hover:bg-black/55
              "
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="
                absolute right-3 top-1/2 -translate-y-1/2
                h-10 w-10 rounded-full
                bg-black/45 text-white backdrop-blur-sm
                opacity-0 group-hover:opacity-100 transition
                hover:bg-black/55
              "
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {pics.length > 1 && (
        <div className="p-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pics.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(i)}
                className={[
                  "relative h-16 w-24 rounded-xl overflow-hidden border shrink-0",
                  i === active ? "border-transparent ring-2" : "border-slate-200",
                ].join(" ")}
                style={i === active ? { boxShadow: `0 0 0 2px ${GOLD}` } : undefined}
                aria-label={`Image ${i + 1}`}
              >
                <SafeImg src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FULLSCREEN MODAL */}
      {open && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-6xl w-[96vw] h-[86vh]"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => begin(e.clientX, e.clientY)}
            onMouseUp={(e) => end(e.clientX, e.clientY)}
            onMouseLeave={(e) => end(e.clientX, e.clientY)}
            onTouchStart={(e) => begin(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={(e) => end(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
          >
            <SafeImg
              src={mainSrc}
              alt={title}
              className="h-full w-full object-contain select-none"
              draggable={false}
            />

            <div className="absolute top-3 left-1/2 -translate-x-1/2 text-white/90 text-sm">
              {Math.min(active + 1, Math.max(pics.length, 1))} / {Math.max(pics.length, 1)}
            </div>

            <button
              className="absolute top-3 right-3 h-9 px-3 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setOpen(false)}
              type="button"
            >
              Close ✕
            </button>

            {pics.length > 1 && (
              <>
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/15 text-white hover:bg-white/25"
                  onClick={prev}
                  aria-label="Previous"
                  type="button"
                >
                  ‹
                </button>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/15 text-white hover:bg-white/25"
                  onClick={next}
                  aria-label="Next"
                  type="button"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
