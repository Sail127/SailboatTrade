/*
  Warnings:

  - The values [READY_FOR_CHECKOUT] on the enum `ListingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `engineModel` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `locationAdmin1` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `paymentProvider` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `paymentSessionId` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `pendingDescription` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `pendingHeroImageUrl` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `pendingImageUrls` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `pendingTitle` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `plan` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `submittedForReviewAt` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `tankHolding` on the `Listing` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[braintreeSubscriptionId]` on the table `Listing` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[braintreeCustomerId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PhotoPlan" AS ENUM ('FREE_3', 'PHOTO_PLUS_25');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('FREE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterEnum
BEGIN;
CREATE TYPE "ListingStatus_new" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'REJECTED', 'PUBLISHED', 'ARCHIVED', 'REMOVED');
ALTER TABLE "public"."Listing" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Listing" ALTER COLUMN "status" TYPE "ListingStatus_new" USING ("status"::text::"ListingStatus_new");
ALTER TYPE "ListingStatus" RENAME TO "ListingStatus_old";
ALTER TYPE "ListingStatus_new" RENAME TO "ListingStatus";
DROP TYPE "public"."ListingStatus_old";
ALTER TABLE "Listing" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "engineModel",
DROP COLUMN "locationAdmin1",
DROP COLUMN "paidAt",
DROP COLUMN "paymentProvider",
DROP COLUMN "paymentSessionId",
DROP COLUMN "paymentStatus",
DROP COLUMN "pendingDescription",
DROP COLUMN "pendingHeroImageUrl",
DROP COLUMN "pendingImageUrls",
DROP COLUMN "pendingTitle",
DROP COLUMN "plan",
DROP COLUMN "publishedAt",
DROP COLUMN "submittedForReviewAt",
DROP COLUMN "tankHolding",
ADD COLUMN     "billingAddons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "billingCurrency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "billingCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "billingCurrentPeriodStart" TIMESTAMP(3),
ADD COLUMN     "billingMonthlyCents" INTEGER,
ADD COLUMN     "billingProvider" TEXT,
ADD COLUMN     "billingStatus" "BillingStatus" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "braintreeSubscriptionId" TEXT,
ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "featuredHome" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastPaidAt" TIMESTAMP(3),
ADD COLUMN     "photoPlan" "PhotoPlan" NOT NULL DEFAULT 'FREE_3';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "braintreeCustomerId" TEXT,
ALTER COLUMN "brokerageCountry" SET DATA TYPE TEXT,
ALTER COLUMN "homeportCountry" SET DATA TYPE TEXT;

-- DropEnum
DROP TYPE "ListingPlan";

-- DropEnum
DROP TYPE "PaymentStatus";

-- CreateIndex
CREATE UNIQUE INDEX "Listing_braintreeSubscriptionId_key" ON "Listing"("braintreeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_braintreeCustomerId_key" ON "User"("braintreeCustomerId");
