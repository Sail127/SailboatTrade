/*
  Warnings:

  - A unique constraint covering the columns `[previewToken]` on the table `Listing` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "previewToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Listing_previewToken_key" ON "Listing"("previewToken");
