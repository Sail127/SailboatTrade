-- Add distinct SOLD listing status so sold listings are separate from archived listings.
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'SOLD';
