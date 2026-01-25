// components/Header.js
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const CONTAINER = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

function MenuIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </>
      )}
    </svg>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLink =
    "block px-3 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-black/10 hover:text-white transition";

  return (
    <header
      className={[
        "sticky top-0 z-50",
        "bg-[#0a2230]/95 backdrop-blur",
        "border-b border-white/10",
        scrolled ? "shadow-lg shadow-black/20" : "shadow-none",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute left-0 right-0 top-full h-8 bg-gradient-to-b from-[#0a2230]/35 to-transparent" />

      <div className={`${CONTAINER} h-16`}>
        <div className="relative h-full flex items-center">
          {/* Left: burgee */}
          <Link
            href="/"
            className="flex items-center shrink-0"
            aria-label="Go to homepage"
            onClick={() => setOpen(false)}
          >
            <Image
              src="/burgee.png"
              alt="SailboatTrade burgee"
              width={72}
              height={72}
              className="h-14 w-auto object-contain"
              priority
            />
          </Link>

          {/* Left-ish: name + slogan (hide on small) */}
          <Link
            href="/"
            className="ml-3 leading-tight text-left hidden sm:block"
            onClick={() => setOpen(false)}
          >
            <div
              className="text-xl sm:text-2xl font-bold text-white leading-none whitespace-nowrap"
              style={{
                fontFamily: "var(--font-brand, inherit)",
                letterSpacing: "0.03em",
                textShadow: "0 1px 0 rgba(0,0,0,0.55), 0 0 10px rgba(0,0,0,0.18)",
              }}
            >
              Sailboat<span className="text-[#c8a44d]">Trade</span>
              <span className="text-slate-300" style={{ letterSpacing: "0.06em" }}>
                .com
              </span>
            </div>
            <div className="text-[11px] text-slate-300">Built by Sailors – For Sailors</div>
          </Link>

          {/* Right: search + hamburger */}
          <div className="ml-auto flex items-center gap-3">
            {/* Small header search (same width vibe as name) */}
            <input
              type="search"
              placeholder="Search…"
              className="hidden sm:block h-9 w-56 rounded-lg border border-white/15 bg-white text-[#0a2230] px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
            />

            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                className={[
                  "h-10 w-10 inline-flex items-center justify-center rounded-lg",
                  "border border-white/15 bg-white/5 text-white",
                  "hover:bg-white/10 hover:border-white/25 transition",
                  open ? "ring-2 ring-white/15" : "",
                ].join(" ")}
              >
                <MenuIcon open={open} />
              </button>

              {open && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-white/10 backdrop-blur-[2px]"
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                  />

                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/15 bg-[#0f2a3b]/98 backdrop-blur shadow-2xl shadow-black/25 p-2 z-50 text-white">
                    {/* ✅ MUST match footer menu */}
                    <Link href="/login" className={navLink} onClick={() => setOpen(false)}>
                      Login
                    </Link>
                    <Link href="/why-list" className={navLink} onClick={() => setOpen(false)}>
                      Why sell with us?
                    </Link>
                    <Link href="/listings/new" className={navLink} onClick={() => setOpen(false)}>
                      Post a Sailboat listing
                    </Link>
                    <Link href="/advertise" className={navLink} onClick={() => setOpen(false)}>
                      Advertise with us
                    </Link>

                    <div className="my-2 h-px bg-white/15" />

                    <Link href="/about" className={navLink} onClick={() => setOpen(false)}>
                      About us
                    </Link>
                    <Link href="/contact" className={navLink} onClick={() => setOpen(false)}>
                      Contact
                    </Link>
                    <Link href="/privacy-terms" className={navLink} onClick={() => setOpen(false)}>
                      Privacy &amp; Terms
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
