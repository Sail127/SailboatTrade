export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sailboattrade.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/checkout/",
          "/api/",
          "/login",
          "/register",
          "/verify-email",
          "/reset-password",
          "/forgot-password",
          "/listings/preview/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
