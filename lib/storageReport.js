import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import { getR2, getR2Bucket } from "@/lib/r2";

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

function displayOwnerName(owner) {
  const full = `${String(owner?.firstName || "").trim()} ${String(owner?.lastName || "").trim()}`.trim();
  return full || String(owner?.name || "").trim() || String(owner?.businessName || "").trim() || "Unknown owner";
}

function displayListingTitle(listing) {
  const year = listing?.year != null ? String(listing.year) : "";
  const builder = String(listing?.builder || "").trim();
  const model = String(listing?.model || "").trim();
  return [year, builder, model].filter(Boolean).join(" ") || String(listing?.title || "Untitled listing").trim();
}

function addBytes(map, key, bytes) {
  const normalized = String(key || "").trim();
  if (!normalized) return;
  map.set(normalized, (map.get(normalized) || 0) + Number(bytes || 0));
}

export async function getStorageReport() {
  const [users, listings] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        businessName: true,
        brokerHeroImageUrl: true,
      },
    }),
    prisma.listing.findMany({
      select: {
        id: true,
        ownerId: true,
        status: true,
        title: true,
        year: true,
        builder: true,
        model: true,
        heroImageUrl: true,
        brokerHeroImageUrl: true,
        imageUrls: true,
        updatedAt: true,
      },
    }),
  ]);

  const r2 = getR2();
  const Bucket = getR2Bucket();
  const sizeByKey = new Map();
  let totalObjects = 0;
  let totalBytes = 0;
  let continuationToken;

  while (true) {
    const response = await r2.send(
      new ListObjectsV2Command({
        Bucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );

    const contents = Array.isArray(response?.Contents) ? response.Contents : [];
    for (const item of contents) {
      const key = String(item?.Key || "").trim();
      if (!key) continue;
      const bytes = Number(item?.Size || 0);
      sizeByKey.set(key, bytes);
      totalObjects += 1;
      totalBytes += bytes;
    }

    if (!response?.IsTruncated) break;
    continuationToken = response?.NextContinuationToken;
    if (!continuationToken) break;
  }

  const referencedKeys = new Set();
  const bytesByOwner = new Map();
  const bytesByListing = new Map();
  const statusBuckets = new Map();

  for (const user of users) {
    const key = String(user?.brokerHeroImageUrl || "").trim();
    if (!key) continue;
    referencedKeys.add(key);
    addBytes(bytesByOwner, user.id, sizeByKey.get(key) || 0);
  }

  for (const listing of listings) {
    const keys = uniq([
      listing.heroImageUrl,
      listing.brokerHeroImageUrl,
      ...(Array.isArray(listing.imageUrls) ? listing.imageUrls : []),
    ]);

    let listingBytes = 0;
    for (const key of keys) {
      referencedKeys.add(key);
      const bytes = sizeByKey.get(key) || 0;
      listingBytes += bytes;
      addBytes(bytesByOwner, listing.ownerId, bytes);
    }
    bytesByListing.set(listing.id, listingBytes);

    const status = String(listing.status || "UNKNOWN").toUpperCase();
    const bucket = statusBuckets.get(status) || { status, listingCount: 0, assetCount: 0, bytes: 0 };
    bucket.listingCount += 1;
    bucket.assetCount += keys.length;
    bucket.bytes += listingBytes;
    statusBuckets.set(status, bucket);
  }

  let orphanedObjects = 0;
  let orphanedBytes = 0;
  for (const [key, bytes] of sizeByKey.entries()) {
    if (referencedKeys.has(key)) continue;
    orphanedObjects += 1;
    orphanedBytes += bytes;
  }

  const userById = new Map(users.map((user) => [user.id, user]));

  const topOwners = Array.from(bytesByOwner.entries())
    .map(([ownerId, bytes]) => {
      const owner = userById.get(ownerId) || null;
      return {
        ownerId,
        ownerName: displayOwnerName(owner),
        ownerEmail: owner?.email || "",
        bytes,
      };
    })
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 8);

  const listingById = new Map(listings.map((listing) => [listing.id, listing]));
  const topListings = Array.from(bytesByListing.entries())
    .map(([listingId, bytes]) => {
      const listing = listingById.get(listingId) || null;
      return {
        listingId,
        title: displayListingTitle(listing),
        status: String(listing?.status || ""),
        ownerName: displayOwnerName(userById.get(listing?.ownerId) || null),
        bytes,
        updatedAt: listing?.updatedAt || null,
      };
    })
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 8);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      objects: totalObjects,
      bytes: totalBytes,
      referencedObjects: referencedKeys.size,
      orphanedObjects,
      orphanedBytes,
    },
    byStatus: Array.from(statusBuckets.values()).sort((a, b) => b.bytes - a.bytes),
    topOwners,
    topListings,
  };
}
