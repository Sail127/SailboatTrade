import "./globals.css";
import Header from "../components/Header.js";
import Footer from "../components/Footer.js";
import { Inter, Libre_Baskerville } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { readSession } from "@/lib/auth";
import "react-international-phone/style.css";

const SITE_URL_RAW =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.APP_URL ||
  "https://www.sailboattrade.com";

function toMetadataBase(raw) {
  const v = String(raw || "").trim();
  try {
    return new URL(v);
  } catch {
    return new URL(`https://${v.replace(/^\/+/, "")}`);
  }
}

const METADATA_BASE = toMetadataBase(SITE_URL_RAW);

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
  metadataBase: METADATA_BASE,
  title: "SailboatTrade - Buy. Sell. Sail.",
  description: "A sailboat-only marketplace built by sailors for sailors.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "SailboatTrade",
    title: "SailboatTrade - Buy. Sell. Sail.",
    description: "A sailboat-only marketplace built by sailors for sailors.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SailboatTrade - Buy. Sell. Sail.",
    description: "A sailboat-only marketplace built by sailors for sailors.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/images/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/images/favicon/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/images/favicon/site.webmanifest",
};

export default async function RootLayout({ children }) {
  const session = await readSession().catch(() => null);

  return (
    <html lang="en" className={`h-full ${sans.variable} ${brand.variable}`}>
      <body className="min-h-screen flex flex-col font-sans text-slate-900 bg-[#0a2230]">
        <Suspense fallback={<div className="h-[72px] bg-[#0a2230]" />}>
          <Header initialUser={session || null} />
        </Suspense>
        <div className="flex-1 bg-[#f8fafc]">{children}</div>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
