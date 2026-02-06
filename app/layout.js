// app/layout.js
import "./globals.css";
import Header from "../components/Header.js";
import Footer from "../components/Footer.js";
import { Inter, Libre_Baskerville } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const brand = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata = {
  title: "SailboatTrade — Buy. Sell. Sail.",
  description: "A sailboat-only marketplace built by sailors for sailors.",

  // ✅ Favicon + app icons
  icons: {
    // Chrome + most browsers (strongest fallback first)
    icon: [
      { url: "/favicon.ico" }, // IMPORTANT: put this at /public/favicon.ico
      { url: "/images/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    // iOS home screen icon
    apple: [{ url: "/images/favicon/apple-touch-icon.png", sizes: "180x180" }],
  },

  // ✅ Manifest (keeps your existing path)
  manifest: "/images/favicon/site.webmanifest",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`h-full ${sans.variable} ${brand.variable}`}>
      <body className="min-h-screen flex flex-col font-sans text-slate-900 bg-[#0a2230]">
        <Header />

        {/* Light-gray content canvas */}
        <main className="flex-1 bg-[#f8fafc]">{children}</main>

        <Footer />
      </body>
    </html>
  );
}
