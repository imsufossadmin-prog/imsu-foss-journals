-- Drafts are created as soon as an author chooses a journal. Details and the
-- permanent tracking number are completed later in the guided workflow.
ALTER TABLE "Submission"
  ALTER COLUMN "trackingNumber" DROP NOT NULL,
  ALTER COLUMN "title" DROP NOT NULL,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "declarationAccuracy" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "declarationAuthority" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "declarationReadiness" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "SubmissionCounter" (
  "id" TEXT NOT NULL,
  "journalId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "lastValue" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SubmissionCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubmissionCounter_journalId_year_key"
  ON "SubmissionCounter"("journalId", "year");

CREATE INDEX "Submission_ownerId_status_updatedAt_idx"
  ON "Submission"("ownerId", "status", "updatedAt");

-- Phase 3 exposes one current file per first-submission category. Replacement
-- is performed transactionally so there is never an ambiguous manuscript.
CREATE UNIQUE INDEX "SubmissionFile_submissionId_type_key"
  ON "SubmissionFile"("submissionId", "type");

ALTER TABLE "SubmissionCounter"
  ADD CONSTRAINT "SubmissionCounter_journalId_fkey"
  FOREIGN KEY ("journalId") REFERENCES "Journal"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubmissionCounter"
  ADD CONSTRAINT "SubmissionCounter_year_positive" CHECK ("year" > 0);

ALTER TABLE "SubmissionCounter"
  ADD CONSTRAINT "SubmissionCounter_lastValue_nonnegative" CHECK ("lastValue" >= 0);
