// components/Footer.js
import Image from "next/image";
import Link from "next/link";

const CONTAINER = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";
const GOLD = "#c8a44d";

export default function Footer() {
  return (
    <footer className="relative bg-[#0a2230]/95 backdrop-blur border-t border-white/10">
      {/* ✅ Match header shadow + transition exactly */}
      <div className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-t from-[#0a2230]/35 to-transparent" />

      <div className={CONTAINER}>
        <div className="px-4 py-3 sm:px-6 sm:py-3">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/burgee.png"
              alt="SailboatTrade burgee"
              width={72}
              height={72}
              className="h-14 w-auto object-contain self-center"
              priority={false}
            />

            <div className="text-center leading-none">
              {/* Row 1 */}
              <div
                className="text-xl sm:text-2xl font-bold text-white whitespace-nowrap leading-none"
                style={{
                  fontFamily: "var(--font-brand, inherit)",
                  letterSpacing: "0.03em",
                  textShadow:
                    "0 1px 0 rgba(0,0,0,0.55), 0 0 10px rgba(0,0,0,0.18)",
                }}
              >
                All Sailboats, <span style={{ color: GOLD }}>All the time!</span>
              </div>

              {/* Row 2 (links) */}
              <nav className="mt-1 flex items-center justify-center gap-4 text-[12px] text-white/80 leading-none">
                <Link href="/why-list" className="hover:text-white transition">
                  Why List with ST.com?
                </Link>
                <Link href="/contact" className="hover:text-white transition">
                  Contact Us
                </Link>
                <Link href="/privacy-terms" className="hover:text-white transition">
                  Privacy &amp; Terms
                </Link>
              </nav>

              {/* ✅ More spacing between links and copyright */}
              <div className="mt-3 text-[11px] text-white/60 leading-none">
                © {new Date().getFullYear()} Sailboat Trade LLC.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
