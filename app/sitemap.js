// app/sitemap.js
export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sailboattrade.com';

  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/listings`, lastModified: new Date() },
  ];
}
