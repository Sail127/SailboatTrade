// components/Footer.js
import Image from "next/image";
import Link from "next/link";

const CONTAINER = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

export default function Footer() {
  return (
    <footer className="bg-[#0a2230] border-t border-white/10">
      <div className={CONTAINER}>
        <div className="px-6 py-10 sm:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <Image
                src="/burgee.png"
                alt="SailboatTrade burgee"
                width={34}
                height={34}
                className="h-[34px] w-[34px] object-contain"
              />
              <div className="leading-tight">
                <div className="text-sm font-semibold text-white">
                  Sailboat<span className="text-[#c8a44d]">Trade</span>
                  <span className="text-slate-300">.com</span>
                </div>
                <div className="text-xs text-white/70">
                  Built by Sailors – For Sailors
                </div>
              </div>
            </div>

            {/* Links (match header) */}
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              <Link href="/login" className="hover:text-white transition">Login</Link>
              <Link href="/why-list" className="hover:text-white transition">Why sell with us?</Link>
              <Link href="/listings/new" className="hover:text-white transition">Post a Sailboat listing</Link>
              <Link href="/advertise" className="hover:text-white transition">Advertise with us</Link>
              <Link href="/about" className="hover:text-white transition">About us</Link>
              <Link href="/contact" className="hover:text-white transition">Contact</Link>
              <Link href="/privacy-terms" className="hover:text-white transition">Privacy &amp; Terms</Link>
            </nav>
          </div>

          <div className="mt-8 text-center text-xs text-white/60">
            © {new Date().getFullYear()} Sailboat Trade LLC.
          </div>
        </div>
      </div>
    </footer>
  );
}
