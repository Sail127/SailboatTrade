/*
  Warnings:

  - You are about to alter the column `price` on the `Listing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - Made the column `hasDinghy` on table `Listing` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Listing" ALTER COLUMN "price" SET DATA TYPE INTEGER,
ALTER COLUMN "hasDinghy" SET NOT NULL,
ALTER COLUMN "hasDinghy" SET DEFAULT false;
