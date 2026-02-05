-- CreateEnum
CREATE TYPE "UsRegion" AS ENUM ('WEST_COAST', 'EAST_COAST', 'GULF_COAST', 'GREAT_LAKES', 'OTHER_INLAND_WATERS');

-- AlterEnum
ALTER TYPE "ListingType" ADD VALUE 'TRIMARAN';

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "locationUsRegion" "UsRegion";

-- CreateIndex
CREATE INDEX "Listing_status_locationCountry_locationUsRegion_idx" ON "Listing"("status", "locationCountry", "locationUsRegion");
