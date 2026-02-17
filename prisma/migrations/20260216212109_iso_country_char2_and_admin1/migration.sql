/*
  Warnings:

  - You are about to alter the column `locationCountry` on the `Listing` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(2)`.
  - You are about to alter the column `brokerageCountry` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(2)`.
  - You are about to alter the column `homeportCountry` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(2)`.

*/
-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "locationAdmin1" TEXT,
ALTER COLUMN "locationCountry" SET DATA TYPE CHAR(2);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "homeportAdmin1" TEXT,
ALTER COLUMN "brokerageCountry" SET DATA TYPE CHAR(2),
ALTER COLUMN "homeportCountry" SET DATA TYPE CHAR(2);
