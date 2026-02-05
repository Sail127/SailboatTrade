/*
  Warnings:

  - The `locationUsRegion` column on the `Listing` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Listing_status_locationCountry_locationUsRegion_idx";

-- AlterTable
ALTER TABLE "Listing" ALTER COLUMN "status" SET DEFAULT 'DRAFT',
ALTER COLUMN "currency" DROP NOT NULL,
DROP COLUMN "locationUsRegion",
ADD COLUMN     "locationUsRegion" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name";

-- DropEnum
DROP TYPE "UsRegion";

-- CreateIndex
CREATE INDEX "Listing_status_locationUsRegion_idx" ON "Listing"("status", "locationUsRegion");
