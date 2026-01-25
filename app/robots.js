// app/robots.js
export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sailboattrade.com';

  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${base}/sitemap.xml`,
    host: base, // optional but nice for canonical host
  };
}
