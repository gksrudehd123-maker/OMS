-- AlterTable
ALTER TABLE "message_templates" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'SMS';

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "msgType" TEXT NOT NULL,
    "title" TEXT,
    "templateId" TEXT,
    "status" TEXT NOT NULL,
    "resultCode" TEXT,
    "resultMsg" TEXT,
    "msgId" TEXT,
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sms_logs_recipient_idx" ON "sms_logs"("recipient");

-- CreateIndex
CREATE INDEX "sms_logs_createdAt_idx" ON "sms_logs"("createdAt");

-- CreateIndex
CREATE INDEX "sms_logs_status_idx" ON "sms_logs"("status");
