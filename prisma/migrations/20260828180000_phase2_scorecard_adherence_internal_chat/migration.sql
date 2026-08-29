-- CreateEnum
CREATE TYPE "AdherenceOutcome" AS ENUM ('ADHERED', 'PARTIALLY_ADHERED', 'DID_NOT_ADHERE');

-- AlterEnum
ALTER TYPE "SubmissionEventType" ADD VALUE 'ADHERENCE_REPORT_SUBMITTED';

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "apaAdherence" INTEGER,
ADD COLUMN     "conclusion" INTEGER,
ADD COLUMN     "generalReport" TEXT,
ADD COLUMN     "introductionThesis" INTEGER,
ADD COLUMN     "languageStyle" INTEGER,
ADD COLUMN     "literatureReview" INTEGER,
ADD COLUMN     "resultsDiscussion" INTEGER,
ADD COLUMN     "titleAbstract" INTEGER;

-- CreateTable
CREATE TABLE "ReviewAttachment" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "storedFileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdherenceReport" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "submissionVersionId" TEXT,
    "editorId" UUID NOT NULL,
    "outcome" "AdherenceOutcome" NOT NULL,
    "report" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdherenceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalChatMessage" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "senderId" UUID NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalChatAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "storedFileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalChatAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewAttachment_storedFileId_key" ON "ReviewAttachment"("storedFileId");

-- CreateIndex
CREATE INDEX "ReviewAttachment_reviewId_idx" ON "ReviewAttachment"("reviewId");

-- CreateIndex
CREATE INDEX "AdherenceReport_submissionId_createdAt_idx" ON "AdherenceReport"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "AdherenceReport_editorId_idx" ON "AdherenceReport"("editorId");

-- CreateIndex
CREATE INDEX "InternalChatMessage_journalId_createdAt_idx" ON "InternalChatMessage"("journalId", "createdAt");

-- CreateIndex
CREATE INDEX "InternalChatMessage_senderId_idx" ON "InternalChatMessage"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalChatAttachment_storedFileId_key" ON "InternalChatAttachment"("storedFileId");

-- CreateIndex
CREATE INDEX "InternalChatAttachment_messageId_idx" ON "InternalChatAttachment"("messageId");

-- AddForeignKey
ALTER TABLE "ReviewAttachment" ADD CONSTRAINT "ReviewAttachment_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAttachment" ADD CONSTRAINT "ReviewAttachment_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdherenceReport" ADD CONSTRAINT "AdherenceReport_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdherenceReport" ADD CONSTRAINT "AdherenceReport_submissionVersionId_fkey" FOREIGN KEY ("submissionVersionId") REFERENCES "SubmissionVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdherenceReport" ADD CONSTRAINT "AdherenceReport_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalChatMessage" ADD CONSTRAINT "InternalChatMessage_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalChatMessage" ADD CONSTRAINT "InternalChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalChatAttachment" ADD CONSTRAINT "InternalChatAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "InternalChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalChatAttachment" ADD CONSTRAINT "InternalChatAttachment_storedFileId_fkey" FOREIGN KEY ("storedFileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
