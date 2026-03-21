import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import { getR2, getR2Bucket } from "@/lib/r2";

function isSafeR2Key(key) {
  const value = String(key || "").trim();
  if (!value) return false;
  if (value.startsWith("/") || value.startsWith("\\")) return false;
  if (value.startsWith("http://") || value.startsWith("https://")) return false;
  if (value.startsWith("data:")) return false;
  if (value.includes("..")) return false;
  return true;
}

function uniq(values) {
  const out = [];
  const seen = new Set();
  for (const value of values || []) {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export async function deleteListingR2Assets(keys) {
  const safeKeys = uniq(keys).filter(isSafeR2Key);
  if (safeKeys.length === 0) {
    return { attempted: 0, deleted: 0 };
  }

  const r2 = getR2();
  const Bucket = getR2Bucket();
  let deletedTotal = 0;

  for (let i = 0; i < safeKeys.length; i += 1000) {
    const chunk = safeKeys.slice(i, i + 1000);
    const response = await r2.send(
      new DeleteObjectsCommand({
        Bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      })
    );

    const errors = Array.isArray(response?.Errors) ? response.Errors : [];
    if (errors.length) {
      const err = new Error("R2 delete failed for one or more objects.");
      err.details = errors.slice(0, 8).map((item) => ({
        key: item?.Key,
        code: item?.Code,
        message: item?.Message,
      }));
      throw err;
    }

    deletedTotal += chunk.length;
  }

  return { attempted: safeKeys.length, deleted: deletedTotal };
}

export async function deleteListingCompletely(listingId) {
  const normalizedListingId = String(listingId || "").trim();
  if (!normalizedListingId) {
    throw new Error("Missing listing id.");
  }

  const listing = await prisma.listing.findUnique({
    where: { id: normalizedListingId },
    select: {
      id: true,
      ownerId: true,
      title: true,
      status: true,
      heroImageUrl: true,
      brokerHeroImageUrl: true,
      imageUrls: true,
    },
  });

  if (!listing) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const assetKeys = uniq([
    listing.heroImageUrl,
    listing.brokerHeroImageUrl,
    ...(Array.isArray(listing.imageUrls) ? listing.imageUrls : []),
  ]);

  await deleteListingR2Assets(assetKeys);

  const [favoriteResult, auditResult, listingResult] = await prisma.$transaction([
    prisma.favorite.deleteMany({ where: { listingId: listing.id } }),
    prisma.adminAuditLog.deleteMany({
      where: {
        entityType: "Listing",
        entityId: listing.id,
      },
    }),
    prisma.listing.deleteMany({ where: { id: listing.id } }),
  ]);

  if (!listingResult || listingResult.count !== 1) {
    throw new Error("Delete failed (listing not deleted).");
  }

  return {
    ok: true,
    listing,
    deletedFavorites: favoriteResult?.count ?? 0,
    deletedAuditLogs: auditResult?.count ?? 0,
    deletedAssets: assetKeys.length,
  };
}
