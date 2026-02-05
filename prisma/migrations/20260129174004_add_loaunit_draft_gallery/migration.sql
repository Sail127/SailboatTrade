-- Fix legacy rows that violate new NOT NULL constraints
DELETE FROM "Listing" WHERE "ownerId" IS NULL;
UPDATE "Listing"
SET "previewToken" = 'legacy_' || md5(random()::text || clock_timestamp()::text)
WHERE "previewToken" IS NULL;

/*
  Warnings:

  - The primary key for the `Listing` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `beam` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `beamUnit` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `brokerCompany` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `brokerEmail` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `brokerLogoUrl` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `brokerName` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `brokerPhone` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `contactEmail` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `displacement` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `displacementUnit` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `engineHours` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `equipment` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `length` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `lengthUnit` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `locationRegion` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `make` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Listing` table. All the data in the column will be lost.
  - The `imageUrls` column on the `Listing` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - Made the column `ownerId` on table `Listing` required. This step will fail if there are existing NULL values in that column.
  - Made the column `previewToken` on table `Listing` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ListingPlan" AS ENUM ('STANDARD', 'FEATURED_HOME');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NONE', 'PENDING', 'PAID', 'FAILED');

-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'READY_FOR_CHECKOUT';

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_ownerId_fkey";

-- DropIndex
DROP INDEX "Listing_status_createdAt_idx";

-- DropIndex
DROP INDEX "Listing_status_length_idx";

-- DropIndex
DROP INDEX "Listing_status_locationCountry_idx";

-- DropIndex
DROP INDEX "Listing_status_locationUsRegion_idx";

-- DropIndex
DROP INDEX "Listing_status_make_idx";

-- DropIndex
DROP INDEX "Listing_status_price_idx";

-- DropIndex
DROP INDEX "Listing_status_type_idx";

-- DropIndex
DROP INDEX "Listing_status_updatedAt_idx";

-- DropIndex
DROP INDEX "Listing_status_year_idx";

-- AlterTable
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_pkey",
DROP COLUMN "beam",
DROP COLUMN "beamUnit",
DROP COLUMN "brokerCompany",
DROP COLUMN "brokerEmail",
DROP COLUMN "brokerLogoUrl",
DROP COLUMN "brokerName",
DROP COLUMN "brokerPhone",
DROP COLUMN "contactEmail",
DROP COLUMN "displacement",
DROP COLUMN "displacementUnit",
DROP COLUMN "engineHours",
DROP COLUMN "equipment",
DROP COLUMN "length",
DROP COLUMN "lengthUnit",
DROP COLUMN "locationRegion",
DROP COLUMN "make",
DROP COLUMN "type",
ADD COLUMN     "builder" TEXT,
ADD COLUMN     "loa" DOUBLE PRECISION,
ADD COLUMN     "loaUnit" TEXT,
ADD COLUMN     "locationState" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "paymentSessionId" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "plan" "ListingPlan" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "currency" DROP DEFAULT,
ALTER COLUMN "draftUnit" DROP DEFAULT,
DROP COLUMN "imageUrls",
ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "ownerId" SET NOT NULL,
ALTER COLUMN "ownerId" SET DATA TYPE TEXT,
ALTER COLUMN "previewToken" SET NOT NULL,
ADD CONSTRAINT "Listing_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Listing_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "updatedAt",
ADD COLUMN     "name" TEXT,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- DropEnum
DROP TYPE "ListingType";

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_listingId_key" ON "Favorite"("userId", "listingId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
