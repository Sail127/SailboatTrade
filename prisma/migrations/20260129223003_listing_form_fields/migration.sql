-- CreateEnum
CREATE TYPE "HullType" AS ENUM ('MONOHULL', 'CATAMARAN', 'TRIMARAN');

-- CreateEnum
CREATE TYPE "SellerRole" AS ENUM ('OWNER', 'BROKER');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "brokerLogoUrl" TEXT,
ADD COLUMN     "brokerageAddress" TEXT,
ADD COLUMN     "brokerageName" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "engineHours" INTEGER,
ADD COLUMN     "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "listingContactName" TEXT,
ADD COLUMN     "sellerRole" "SellerRole",
ADD COLUMN     "type" "HullType";
