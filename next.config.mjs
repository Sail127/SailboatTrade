// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Add any remote image hosts you expect (CDNs, S3, etc.)
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      // { protocol: "https", hostname: "your-cdn.example.com" },
    ],
    dangerouslyAllowSVG: false,
    contentDispositionType: "inline",
    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; sandbox;",
  },
};
export default nextConfig;
