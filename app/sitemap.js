import prisma from "@/lib/prisma";

export const revalidate = 60 * 60;
export const dynamic = "force-dynamic";

function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    "https://www.sailboattrade.com"
  ).replace(/\/+$/, "");
}

export default async function sitemap() {
  const base = baseUrl();
  const now = new Date();

  const staticPaths = [
    "/",
    "/listings",
    "/about",
    "/contact",
    "/why-list",
    "/privacy-terms",
  ];

  const staticEntries = staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const listings = await prisma.listing.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      id: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });

  const listingEntries = listings.map((l) => ({
    url: `${base}/listings/${encodeURIComponent(String(l.id))}`,
    lastModified: l.updatedAt || now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticEntries, ...listingEntries];
}
