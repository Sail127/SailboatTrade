CREATE TABLE "DraftUpload" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claimedListingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTouchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "DraftUpload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DraftUpload_key_key" ON "DraftUpload"("key");
CREATE INDEX "DraftUpload_userId_lastTouchedAt_idx" ON "DraftUpload"("userId", "lastTouchedAt");
CREATE INDEX "DraftUpload_claimedListingId_idx" ON "DraftUpload"("claimedListingId");
CREATE INDEX "DraftUpload_claimedAt_lastTouchedAt_idx" ON "DraftUpload"("claimedAt", "lastTouchedAt");

ALTER TABLE "DraftUpload"
ADD CONSTRAINT "DraftUpload_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DraftUpload"
ADD CONSTRAINT "DraftUpload_claimedListingId_fkey"
FOREIGN KEY ("claimedListingId") REFERENCES "Listing"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
