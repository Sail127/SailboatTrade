CREATE TABLE "ListingSaleReport" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "soldOnSailboatTrade" BOOLEAN NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingSaleReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListingSaleReport_listingId_key" ON "ListingSaleReport"("listingId");
CREATE INDEX "ListingSaleReport_ownerId_createdAt_idx" ON "ListingSaleReport"("ownerId", "createdAt");
CREATE INDEX "ListingSaleReport_soldOnSailboatTrade_createdAt_idx" ON "ListingSaleReport"("soldOnSailboatTrade", "createdAt");

ALTER TABLE "ListingSaleReport"
ADD CONSTRAINT "ListingSaleReport_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ListingSaleReport"
ADD CONSTRAINT "ListingSaleReport_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
