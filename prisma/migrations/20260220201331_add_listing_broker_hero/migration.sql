/*
  Warnings:

  - You are about to drop the column `brokerLogoUrl` on the `Listing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "brokerLogoUrl",
ADD COLUMN     "brokerHeroImageUrl" TEXT,
ALTER COLUMN "locationCountry" SET DATA TYPE TEXT;
