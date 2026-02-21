-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('lb', 'kg');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "additionalInfo" TEXT,
ADD COLUMN     "displacement" DOUBLE PRECISION,
ADD COLUMN     "displacementUnit" "WeightUnit",
ADD COLUMN     "riggingRemarks" TEXT;
