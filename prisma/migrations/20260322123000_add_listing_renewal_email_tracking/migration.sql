ALTER TABLE "Listing"
ADD COLUMN "renewalReminderLastSentAt" TIMESTAMP(3),
ADD COLUMN "expiredEmailSentAt" TIMESTAMP(3);
