import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import FavoritesUI from "./ui";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const s = await requireUser().catch(() => null);
  if (!s?.uid) {
    redirect(`/login?next=${encodeURIComponent("/dashboard/favorites")}`);
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: s.uid },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      listing: {
        select: {
          id: true,
          title: true,
          heroImageUrl: true,
          imageUrls: true,
          price: true,
          currency: true,
          year: true,
          builder: true,
          model: true,
          loa: true,
          loaUnit: true,
          type: true,
          locationCity: true,
          locationState: true,
          locationCountry: true,
          locationUsRegion: true,
          status: true,
          expiresAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const items = favorites.map((f) => ({
    id: f.id,
    createdAt: f.createdAt.toISOString(),
    listing: {
      ...f.listing,
      expiresAt: f.listing?.expiresAt ? f.listing.expiresAt.toISOString() : null,
      updatedAt: f.listing?.updatedAt ? f.listing.updatedAt.toISOString() : null,
    },
  }));

  return <FavoritesUI initialItems={items} />;
}
