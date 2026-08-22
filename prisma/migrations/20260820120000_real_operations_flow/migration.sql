ALTER TYPE "SubmissionEventType" ADD VALUE 'TRACKING_ID_ASSIGNED';

CREATE TYPE "SubmissionRequestStatus" AS ENUM (
  'NEW',
  'AWAITING_PAYMENT',
  'RECEIPT_SUBMITTED',
  'SUBMISSION_ENABLED',
  'MANUSCRIPT_SUBMITTED',
  'TRACKING_ASSIGNED'
);

CREATE TYPE "ConversationMessageKind" AS ENUM ('USER', 'SYSTEM');

CREATE TYPE "ConversationAttachmentType" AS ENUM ('GENERAL', 'PAYMENT_RECEIPT');

CREATE TABLE "SubmissionRequest" (
  "id" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "journalId" TEXT NOT NULL,
  "authorId" UUID NOT NULL,
  "submissionId" TEXT,
  "status" "SubmissionRequestStatus" NOT NULL DEFAULT 'NEW',
  "paymentConfirmedAt" TIMESTAMP(3),
  "paymentConfirmedById" UUID,
  "submissionEnabledAt" TIMESTAMP(3),
  "submissionEnabledById" UUID,
  "trackingAssignedAt" TIMESTAMP(3),
  "trackingAssignedById" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SubmissionRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubmissionConversationMessage" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "senderId" UUID,
  "kind" "ConversationMessageKind" NOT NULL DEFAULT 'USER',
  "body" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubmissionConversationMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationAttachment" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "storedFileId" TEXT NOT NULL,
  "type" "ConversationAttachmentType" NOT NULL DEFAULT 'GENERAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConversationAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubmissionRequest_submissionId_key"
ON "SubmissionRequest"("submissionId");

CREATE INDEX "SubmissionRequest_departmentId_status_updatedAt_idx"
ON "SubmissionRequest"("departmentId", "status", "updatedAt");

CREATE INDEX "SubmissionRequest_journalId_status_updatedAt_idx"
ON "SubmissionRequest"("journalId", "status", "updatedAt");

CREATE INDEX "SubmissionRequest_authorId_updatedAt_idx"
ON "SubmissionRequest"("authorId", "updatedAt");

CREATE INDEX "SubmissionRequest_paymentConfirmedById_idx"
ON "SubmissionRequest"("paymentConfirmedById");

CREATE INDEX "SubmissionRequest_submissionEnabledById_idx"
ON "SubmissionRequest"("submissionEnabledById");

CREATE INDEX "SubmissionRequest_trackingAssignedById_idx"
ON "SubmissionRequest"("trackingAssignedById");

CREATE INDEX "SubmissionConversationMessage_requestId_createdAt_idx"
ON "SubmissionConversationMessage"("requestId", "createdAt");

CREATE INDEX "SubmissionConversationMessage_senderId_idx"
ON "SubmissionConversationMessage"("senderId");

CREATE UNIQUE INDEX "ConversationAttachment_storedFileId_key"
ON "ConversationAttachment"("storedFileId");

CREATE INDEX "ConversationAttachment_messageId_idx"
ON "ConversationAttachment"("messageId");

ALTER TABLE "SubmissionRequest"
ADD CONSTRAINT "SubmissionRequest_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SubmissionRequest"
ADD CONSTRAINT "SubmissionRequest_journalId_fkey"
FOREIGN KEY ("journalId") REFERENCES "Journal"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SubmissionRequest"
ADD CONSTRAINT "SubmissionRequest_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SubmissionRequest"
ADD CONSTRAINT "SubmissionRequest_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "Submission"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SubmissionRequest"
ADD CONSTRAINT "SubmissionRequest_paymentConfirmedById_fkey"
FOREIGN KEY ("paymentConfirmedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SubmissionRequest"
ADD CONSTRAINT "SubmissionRequest_submissionEnabledById_fkey"
FOREIGN KEY ("submissionEnabledById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SubmissionRequest"
ADD CONSTRAINT "SubmissionRequest_trackingAssignedById_fkey"
FOREIGN KEY ("trackingAssignedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SubmissionConversationMessage"
ADD CONSTRAINT "SubmissionConversationMessage_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "SubmissionRequest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubmissionConversationMessage"
ADD CONSTRAINT "SubmissionConversationMessage_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConversationAttachment"
ADD CONSTRAINT "ConversationAttachment_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "SubmissionConversationMessage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationAttachment"
ADD CONSTRAINT "ConversationAttachment_storedFileId_fkey"
FOREIGN KEY ("storedFileId") REFERENCES "StoredFile"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
