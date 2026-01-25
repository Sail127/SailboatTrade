// components/Logo.js
export default function Logo({ className = "h-10 w-10" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="SailboatTrade"
    >
      {/* Gold roundel */}
      <circle cx="24" cy="24" r="24" fill="#c8a44d" />
      {/* Sail (forward-leaning) */}
      <path d="M18 35L30 10v25H18z" fill="#ffffff" />
      {/* Wake (curved, dynamic) */}
      <path
        d="M10 33c3.5-1.5 8-2 12.5-.6 4.3 1.3 7.6 2.2 11.7 1.5-4.8 4.1-12.4 6.1-19.3 4.1-2.7-.8-4.6-2.1-4.9-5z"
        fill="#ffffff"
        opacity="0.95"
      />
    </svg>
  );
}
