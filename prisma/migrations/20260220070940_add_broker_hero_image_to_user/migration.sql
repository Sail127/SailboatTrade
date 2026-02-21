-- AlterTable
ALTER TABLE "Listing" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "brokerHeroImageUrl" TEXT;
