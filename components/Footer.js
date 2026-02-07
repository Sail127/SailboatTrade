// components/Footer.js
import Image from "next/image";
import Link from "next/link";

const CONTAINER = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

export default function Footer() {
  return (
    <footer className="relative bg-[#0a2230] border-t border-white/10">
      {/* ✅ Header-matching transition (subtle + tight) */}
      {/* thin highlight line already from border-t; add the same-style fade strip */}
      <div className="pointer-events-none absolute inset-x-0 -top-4 h-4 bg-gradient-to-t from-[#0a2230]/25 to-transparent" />
      {/* optional micro highlight (matches header vibe) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/5" />

      <div className={CONTAINER}>
        <div className="px-4 py-4 sm:px-6 sm:py-4 text-center">
          {/* Slogan: brand font, slightly smaller than header name */}
          <div
            className="text-[15px] sm:text-[17px] font-bold text-white leading-none"
            style={{
              fontFamily: "var(--font-brand, inherit)",
              letterSpacing: "0.03em",
              textShadow: "0 1px 0 rgba(0,0,0,0.45), 0 0 10px rgba(0,0,0,0.12)",
            }}
          >
            All Sailboats, <span className="text-[#c8a44d]">All the time!</span>
          </div>

          {/* Links: slightly smaller, clean */}
          <nav className="mt-2 flex items-center justify-center gap-4 text-[12px] text-white/80">
            <Link href="/about" className="hover:text-white transition">
              About Us
            </Link>
            <Link href="/contact" className="hover:text-white transition">
              Contact Us
            </Link>
            <Link href="/privacy-terms" className="hover:text-white transition">
              Privacy &amp; Terms
            </Link>
          </nav>

          {/* Copyright row: burgee 200% bigger without increasing footer height */}
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-white/60 leading-none">
            <span className="relative inline-flex w-[18px] justify-center">
              {/* Overhang upward slightly so the row height stays tight */}
              <span className="absolute -top-[10px]">
                <Image
                  src="/burgee.png"
                  alt="SailboatTrade burgee"
                  width={28}
                  height={28}
                  className="h-[28px] w-[28px] object-contain"
                />
              </span>
            </span>
            <span>© {new Date().getFullYear()} Sailboat Trade LLC.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
