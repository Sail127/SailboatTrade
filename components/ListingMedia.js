// components/ListingMedia.js
"use client";

import { useEffect, useRef, useState } from "react";

const INK = "#0e2230";
const GOLD = "#c8a44d";

export default function ListingMedia({ images = [], title = "Gallery" }) {
  const pics = Array.isArray(images) ? images.filter(Boolean) : [];
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const next = () => setActive((a) => (a + 1) % pics.length);
  const prev = () => setActive((a) => (a - 1 + pics.length) % pics.length);

  // Keyboard controls (focus trap in modal; page-level when open)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pics.length]);

  // Simple drag/swipe in modal
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

  return (
    <div className="bg-white/5 rounded-2xl p-3 ring-1 ring-white/10">
      {/* Main image */}
      <div className="relative rounded-xl overflow-hidden bg-black/10">
        <img
          src={pics[active] || "/boats/example-sailboat1.jpg"}
          alt={title}
          className="w-full h-[52vh] md:h-[56vh] object-cover cursor-zoom-in"
          onClick={() => setOpen(true)}
          loading="eager"
        />

        {/* Arrows on main (desktop hover) */}
        {pics.length > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white backdrop-blur-sm
                         opacity-0 hover:opacity-100 transition"
              onClick={prev}
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white backdrop-blur-sm
                         opacity-0 hover:opacity-100 transition"
              onClick={next}
              aria-label="Next"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {pics.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {pics.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative h-16 w-24 rounded-lg overflow-hidden ring-2 ${
                i === active ? "ring-[var(--gold,#c8a44d)]" : "ring-transparent"
              }`}
              aria-label={`Image ${i + 1}`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
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
            // Mouse drag
            onMouseDown={(e) => begin(e.clientX, e.clientY)}
            onMouseUp={(e) => end(e.clientX, e.clientY)}
            onMouseLeave={(e) => end(e.clientX, e.clientY)}
            // Touch swipe
            onTouchStart={(e) => begin(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={(e) => end(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
          >
            <img
              src={pics[active]}
              alt={title}
              className="h-full w-full object-contain select-none"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />

            {/* count */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 text-white/90 text-sm">
              {active + 1} / {pics.length}
            </div>

            {/* Close */}
            <button
              className="absolute top-3 right-3 h-9 px-3 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setOpen(false)}
            >
              Close ✕
            </button>

            {/* Nav arrows */}
            {pics.length > 1 && (
              <>
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/15 text-white hover:bg-white/25"
                  onClick={prev}
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/15 text-white hover:bg-white/25"
                  onClick={next}
                  aria-label="Next"
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
