-- AlterTable
ALTER TABLE "User" ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "name" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;
