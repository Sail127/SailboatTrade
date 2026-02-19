import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2, getR2Bucket } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSafeKey(key) {
  const s = String(key || "").trim();
  if (!s) return false;
  if (s.includes("..") || s.startsWith("/") || s.startsWith("\\")) return false;
  return true;
}

function uniq(arr) {
  return Array.from(
    new Set(
      arr
        .filter(Boolean)
        .map((x) => String(x).trim())
        .filter(Boolean),
    ),
  );
}

async function isKeyUsedElsewhere({ listingId, key }) {
  const count = await prisma.listing.count({
    where: {
      NOT: { id: listingId },
      OR: [
        { heroImageUrl: key },
        { brokerLogoUrl: key },
        { pendingHeroImageUrl: key },
        { imageUrls: { has: key } },
        { pendingImageUrls: { has: key } },
      ],
    },
  });
  return count > 0;
}

export async function POST(req, { params }) {
  let s;
  try {
    try {
      try {
        s = await requireUser();
      } catch {
        return NextResponse.json(
          { ok: false, error: "Authentication required" },
          { status: 401 },
        );
      }
    } catch {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 },
      );
    }
  } catch {
    return Response.json(
      { ok: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const listing = await prisma.listing.findFirst({
    where: { id: params.id, ownerId: s.uid },
    select: {
      id: true,
      status: true,
      heroImageUrl: true,
      brokerLogoUrl: true,
      imageUrls: true,
      pendingHeroImageUrl: true,
      pendingImageUrls: true,
    },
  });

  if (!listing) {
    return Response.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const status = String(listing.status || "").toUpperCase();
  if (status !== "ARCHIVED") {
    return Response.json(
      {
        ok: false,
        error: "You can only permanently delete ARCHIVED listings.",
      },
      { status: 400 },
    );
  }

  // Collect candidate keys
  const keys = uniq([
    listing.heroImageUrl,
    listing.brokerLogoUrl,
    listing.pendingHeroImageUrl,
    ...(Array.isArray(listing.imageUrls) ? listing.imageUrls : []),
    ...(Array.isArray(listing.pendingImageUrls)
      ? listing.pendingImageUrls
      : []),
  ]).filter(isSafeKey);

  // Skip keys referenced by other listings
  const deletable = [];
  for (const key of keys) {
    // eslint-disable-next-line no-await-in-loop
    const usedElsewhere = await isKeyUsedElsewhere({
      listingId: listing.id,
      key,
    });
    if (!usedElsewhere) deletable.push(key);
  }

  // Delete R2 objects first (safe retry behavior)
  const r2 = getR2();
  const Bucket = getR2Bucket();

  const results = await Promise.allSettled(
    deletable.map((Key) => r2.send(new DeleteObjectCommand({ Bucket, Key }))),
  );

  const failed = results
    .map((r, i) => ({ r, key: deletable[i] }))
    .filter((x) => x.r.status === "rejected")
    .map((x) => ({
      key: x.key,
      message: x.r.reason?.message || String(x.r.reason || "Delete failed"),
    }));

  if (failed.length > 0) {
    return Response.json(
      {
        ok: false,
        error:
          "Could not delete all images from storage. Listing was NOT deleted.",
        failed,
      },
      { status: 500 },
    );
  }

  // Delete DB rows
  await prisma.$transaction([
    prisma.favorite.deleteMany({ where: { listingId: listing.id } }),
    prisma.listing.delete({ where: { id: listing.id } }),
  ]);

  return Response.json({
    ok: true,
    deletedListingId: listing.id,
    deletedKeys: deletable,
    skippedKeysUsedElsewhere: keys.filter((k) => !deletable.includes(k)),
  });
}
