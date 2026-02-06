-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ContentReviewStatus" AS ENUM ('NONE', 'PENDING', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ListingStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "ListingStatus" ADD VALUE 'REJECTED';
ALTER TYPE "ListingStatus" ADD VALUE 'REMOVED';

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "contentRejectionReason" TEXT,
ADD COLUMN     "contentReviewStatus" "ContentReviewStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "contentReviewedAt" TIMESTAMP(3),
ADD COLUMN     "contentReviewedById" TEXT,
ADD COLUMN     "contentSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "pendingDescription" TEXT,
ADD COLUMN     "pendingHeroImageUrl" TEXT,
ADD COLUMN     "pendingImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pendingTitle" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "removedAt" TIMESTAMP(3),
ADD COLUMN     "removedById" TEXT,
ADD COLUMN     "removedReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "submittedForReviewAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "isDisabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "meta" JSONB,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_contentReviewedById_fkey" FOREIGN KEY ("contentReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
