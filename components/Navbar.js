"use client";

import Link from "next/link";
import Image from "next/image";

function SocialIcon({ href, label, children }) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-white/90 hover:bg-white/10 transition"
    >
      {children}
    </a>
  );
}

export default function Navbar() {
  // Compact header; allow overflow so big logo can bleed without changing height
  const bar  = "sticky top-0 z-50 bg-[#0e2230] border-b border-white/10";
  const wrap = "mx-auto max-w-7xl px-4 md:px-6 h-14 md:h-16 flex items-center justify-between overflow-visible";

  // Tight gap between logo and wordmark
  const brand = "flex items-center gap-1 md:gap-1.5 shrink-0 overflow-visible";

  // Tight right-side spacing to keep everything visible
  const itemText =
    "h-9 inline-flex items-center gap-1.5 px-2 rounded-lg text-white/95 hover:bg-white/10 transition whitespace-nowrap";
  const label = "font-sans text-[13px] md:text-sm font-medium leading-none tracking-tight";

  return (
    <header className={bar}>
      <div className={wrap}>
        {/* Brand: big logo; text pulled closer without growing header */}
        <Link href="/" className={brand}>
          <Image
            src="/st-logo.png"
            alt="SailboatTrade"
            width={88}
            height={88}
            className="-my-6 block" // overflow without increasing bar height
            priority
          />
          <span className="text-white font-semibold leading-none -ml-1 md:-ml-0.5 text-[15px] md:text-base">
            SailboatTrade <span className="text-[#c8a44d]">.com</span>
          </span>
        </Link>

        {/* Right-side nav + socials */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link href="/listings/new" className={itemText}>
            <span className="text-[#c8a44d]">$</span>
            <span className={label}>List your boat</span>
          </Link>

          {/* Advertise: always visible */}
          <Link href="/advertise" className={itemText}>
            <span className={label}>Advertise with us</span>
          </Link>

          {/* My account: icon always visible; text on lg+ for space */}
          <Link href="/account" className={itemText} aria-label="My account">
            {/* Silhouette icon */}
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="currentColor"
              aria-hidden="true"
            >
              {/* Head */}
              <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
              {/* Shoulders / torso */}
              <path d="M4 20a8 8 0 0 1 16 0v1H4Z" />
            </svg>
            <span className={`${label} hidden lg:inline`}>My account</span>
          </Link>

          {/* Socials (YouTube removed) */}
          <div className="hidden sm:flex items-center gap-1.5 pl-0.5">
            {/* Instagram */}
            <SocialIcon href="https://instagram.com/sailboattrade" label="Instagram">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5a5.5 5.5 0 1 1 0 11.001 5.5 5.5 0 0 1 0-11Zm0 2a3.5 3.5 0 1 0 0 7.001 3.5 3.5 0 0 0 0-7.001ZM18 5.9a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z"/>
              </svg>
            </SocialIcon>

            {/* Facebook — 10% bigger and shifted down 1px */}
            <SocialIcon href="https://facebook.com/sailboattrade" label="Facebook">
              <svg
                viewBox="0 0 24 24"
                className="h-[17.6px] w-[17.6px] relative top-[1px]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M13.5 9H16l.5-3h-3V4.5c0-.9.3-1.5 1.7-1.5H16V0c-.3 0-1.3-.1-2.3-.1C11 .1 9.5 1.4 9.5 4v2H7v3h2.5v9H13v-9Z"/>
              </svg>
            </SocialIcon>

            {/* X / Twitter */}
            <SocialIcon href="https://twitter.com/sailboattrade" label="X">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M18.9 2H22l-7 8.1L23.5 22H17l-5-6.6L6.2 22H2.9l7.5-8.7L1 2h6.7l4.6 6.1L18.9 2Zm-1.2 18h1.9L8.4 4H6.5l11.2 16Z"/>
              </svg>
            </SocialIcon>
          </div>
        </div>
      </div>
    </header>
  );
}

