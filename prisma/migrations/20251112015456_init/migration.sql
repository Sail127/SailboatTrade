-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('MONOHULL', 'CATAMARAN');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" SERIAL NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'PUBLISHED',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "type" "ListingType",
    "price" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "length" DOUBLE PRECISION,
    "lengthUnit" TEXT DEFAULT 'ft',
    "beam" DOUBLE PRECISION,
    "beamUnit" TEXT DEFAULT 'ft',
    "draft" DOUBLE PRECISION,
    "draftUnit" TEXT DEFAULT 'ft',
    "displacement" INTEGER,
    "displacementUnit" TEXT DEFAULT 'lb',
    "engineHours" INTEGER,
    "locationCity" TEXT,
    "locationRegion" TEXT,
    "locationCountry" TEXT,
    "contactEmail" TEXT,
    "heroImageUrl" TEXT,
    "imageUrls" JSONB,
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Listing_status_updatedAt_idx" ON "Listing"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_status_type_idx" ON "Listing"("status", "type");

-- CreateIndex
CREATE INDEX "Listing_status_make_idx" ON "Listing"("status", "make");

-- CreateIndex
CREATE INDEX "Listing_status_locationCountry_idx" ON "Listing"("status", "locationCountry");

-- CreateIndex
CREATE INDEX "Listing_status_year_idx" ON "Listing"("status", "year");

-- CreateIndex
CREATE INDEX "Listing_status_length_idx" ON "Listing"("status", "length");

-- CreateIndex
CREATE INDEX "Listing_status_price_idx" ON "Listing"("status", "price");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
