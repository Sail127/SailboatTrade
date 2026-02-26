-- Add listing archive/renewal fields and billing term controls
ALTER TABLE "Listing" ADD COLUMN     "billingTermMonths" INTEGER;
ALTER TABLE "Listing" ADD COLUMN     "billingAutoRenew" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN     "archivedAt" TIMESTAMP(3);
ALTER TABLE "Listing" ADD COLUMN     "archivedImagesPrunedAt" TIMESTAMP(3);
