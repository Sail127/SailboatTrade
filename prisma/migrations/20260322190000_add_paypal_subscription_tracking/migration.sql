ALTER TABLE "Listing"
ADD COLUMN "billingSubscriptionId" TEXT,
ADD COLUMN "billingPlanId" TEXT;

CREATE UNIQUE INDEX "Listing_billingSubscriptionId_key" ON "Listing"("billingSubscriptionId");
