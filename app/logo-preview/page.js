// app/logo-preview/page.js
import Link from "next/link";

export const metadata = {
  title: "SailboatTrade.com — Logo Concepts",
  description: "Preview of SailboatTrade.com logo directions.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <div className="min-h-screen bg-neutral-50 text-gray-800 flex flex-col items-center py-20">
      <h1 className="text-4xl font-bold text-ocean mb-8">
        SailboatTrade.com Logo Concepts
      </h1>

      <div className="grid gap-16 max-w-3xl w-full text-center">
        {/* Option 1 */}
        <div className="border rounded-xl shadow-sm bg-white p-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            ⚓ Nautical Minimalist
          </h2>
          <Link href="/" className="flex items-center justify-center gap-2 text-3xl font-bold text-ocean">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-10 h-10 text-sky"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 21h18M5 19c8-2 8-12 8-12l6 12H5z"
              />
            </svg>
            <span>
              Sailboat<span className="text-sky">Trade</span>
              <span className="text-gray-500 text-xl">.com</span>
            </span>
          </Link>
          <p className="mt-4 text-gray-600">
            Simple, modern, and professional — ideal for your main navbar and favicon.
          </p>
        </div>

        {/* Option 2 */}
        <div className="border rounded-xl shadow-sm bg-white p-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            🌊 Nautical Script (Luxury)
          </h2>
          <Link href="/" className="flex items-baseline justify-center gap-1">
            <span className="font-serif italic text-ocean text-5xl">Sailboat</span>
            <span className="font-sans text-sky text-5xl font-semibold">Trade</span>
            <span className="text-gray-400 text-2xl align-super">.com</span>
          </Link>
          <p className="mt-4 text-gray-600">
            Elegant, lifestyle-oriented — feels like a premium sailing magazine brand.
          </p>
        </div>

        {/* Option 3 */}
        <div className="border rounded-xl shadow-sm bg-white p-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            🧭 Compass Icon (Brand Mark)
          </h2>
          <Link href="/" className="flex items-center justify-center gap-3">
            <div className="bg-sky rounded-full w-14 h-14 flex items-center justify-center shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="w-8 h-8">
                <path d="M12 2l3 7h7l-5.5 4.5L18 22l-6-4-6 4 1.5-8.5L2 9h7z" />
              </svg>
            </div>
            <span className="text-4xl font-bold text-ocean tracking-tight">
              Sailboat<span className="text-sky">Trade</span>
              <span className="text-gray-500 text-2xl">.com</span>
            </span>
          </Link>
          <p className="mt-4 text-gray-600">
            A strong brand mark — perfect for app icons and social branding.
          </p>
        </div>
      </div>
    </div>
  );
}
