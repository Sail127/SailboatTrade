-- Create durable email delivery event log for Resend webhook history
CREATE TABLE "EmailDeliveryEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT,
    "providerMessageId" TEXT,
    "eventType" TEXT NOT NULL,
    "sender" TEXT,
    "recipient" TEXT,
    "subject" TEXT,
    "occurredAt" TIMESTAMP(3),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDeliveryEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailDeliveryEvent_providerEventId_key" ON "EmailDeliveryEvent"("providerEventId");
CREATE INDEX "EmailDeliveryEvent_provider_createdAt_idx" ON "EmailDeliveryEvent"("provider", "createdAt");
CREATE INDEX "EmailDeliveryEvent_providerMessageId_idx" ON "EmailDeliveryEvent"("providerMessageId");
CREATE INDEX "EmailDeliveryEvent_recipient_createdAt_idx" ON "EmailDeliveryEvent"("recipient", "createdAt");
CREATE INDEX "EmailDeliveryEvent_eventType_createdAt_idx" ON "EmailDeliveryEvent"("eventType", "createdAt");
