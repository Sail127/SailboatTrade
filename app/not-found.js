// app/not-found.js
import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center text-center bg-cover bg-center text-sand"
      style={{ backgroundImage: "url('/Bermuda_Triangle.webp')" }} // public/404-bg.jpg
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 px-6">
        <h1 className="text-5xl font-bold mb-4 text-white drop-shadow-lg">
          404 – Page Not Found
        </h1>
        
        <Link
          href="/"
          className="inline-block bg-sea text-white font-semibold px-6 py-3 rounded-md hover:bg-sea/90 transition"
        >
          Sail Back Home
        </Link>
      </div>
    </div>
  );
}
