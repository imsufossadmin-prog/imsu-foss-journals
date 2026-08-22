ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'CORRECTION_REQUESTED' AFTER 'SCREENING';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'AWAITING_REVIEWERS' AFTER 'CORRECTION_REQUESTED';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'REVIEWS_RECEIVED' AFTER 'UNDER_REVIEW';

CREATE TYPE "SubmissionVersionKind" AS ENUM ('ORIGINAL', 'REVISION');
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED');
CREATE TYPE "SubmissionEventType" AS ENUM (
  'SUBMISSION_RECEIVED',
  'INITIAL_ASSESSMENT_STARTED',
  'INITIAL_ASSESSMENT_PASSED',
  'CORRECTION_REQUESTED',
  'REVIEWER_ASSIGNED',
  'REVIEWER_CANCELLED',
  'REVIEW_SUBMITTED',
  'EDITORIAL_DECISION',
  'REVISION_SUBMITTED',
  'REVIEW_ROUND_OPENED'
);

CREATE TABLE "SubmissionVersion" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "kind" "SubmissionVersionKind" NOT NULL,
  "manuscriptStoredFileId" TEXT NOT NULL,
  "responseStoredFileId" TEXT,
  "authorNote" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubmissionVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubmissionVersion_versionNumber_positive" CHECK ("versionNumber" > 0)
);

INSERT INTO "SubmissionVersion" (
  "id", "submissionId", "versionNumber", "kind", "manuscriptStoredFileId", "submittedAt"
)
SELECT
  gen_random_uuid()::text,
  s.id,
  1,
  'ORIGINAL'::"SubmissionVersionKind",
  sf."storedFileId",
  COALESCE(s."submittedAt", sf."createdAt")
FROM "Submission" s
JOIN "SubmissionFile" sf
  ON sf."submissionId" = s.id
  AND sf."type" = 'MANUSCRIPT'
ON CONFLICT DO NOTHING;

ALTER TABLE "ReviewRound" ADD COLUMN "submissionVersionId" TEXT;

UPDATE "ReviewRound" rr
SET "submissionVersionId" = sv.id
FROM "SubmissionVersion" sv
WHERE sv."submissionId" = rr."submissionId"
  AND sv."versionNumber" = 1;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ReviewRound" WHERE "submissionVersionId" IS NULL) THEN
    RAISE EXCEPTION 'Every existing review round must have a manuscript file before Phase 4 migration';
  END IF;
END $$;

ALTER TABLE "ReviewRound" ALTER COLUMN "submissionVersionId" SET NOT NULL;

ALTER TABLE "Review"
  ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "originality" INTEGER,
  ADD COLUMN "methodology" INTEGER,
  ADD COLUMN "clarity" INTEGER,
  ADD COLUMN "relevance" INTEGER,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ALTER COLUMN "recommendation" DROP NOT NULL,
  ALTER COLUMN "commentsToAuthor" DROP NOT NULL,
  ALTER COLUMN "submittedAt" DROP NOT NULL;

UPDATE "Review" SET "status" = 'SUBMITTED' WHERE "submittedAt" IS NOT NULL;

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_originality_range" CHECK ("originality" BETWEEN 1 AND 5),
  ADD CONSTRAINT "Review_methodology_range" CHECK ("methodology" BETWEEN 1 AND 5),
  ADD CONSTRAINT "Review_clarity_range" CHECK ("clarity" BETWEEN 1 AND 5),
  ADD CONSTRAINT "Review_relevance_range" CHECK ("relevance" BETWEEN 1 AND 5),
  ADD CONSTRAINT "Review_version_positive" CHECK ("version" > 0),
  ADD CONSTRAINT "Review_submitted_complete" CHECK (
    "status" = 'DRAFT'
    OR (
      "originality" IS NOT NULL
      AND "methodology" IS NOT NULL
      AND "clarity" IS NOT NULL
      AND "relevance" IS NOT NULL
      AND "recommendation" IS NOT NULL
      AND length(trim("commentsToAuthor")) > 0
      AND "submittedAt" IS NOT NULL
    )
  );

ALTER TABLE "EditorialDecision" ADD COLUMN "revisionDueAt" TIMESTAMP(3);
DROP INDEX IF EXISTS "EditorialDecision_reviewRoundId_idx";
CREATE UNIQUE INDEX "EditorialDecision_reviewRoundId_key" ON "EditorialDecision"("reviewRoundId");

CREATE TABLE "SubmissionEvent" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "type" "SubmissionEventType" NOT NULL,
  "actorId" UUID,
  "reviewRoundId" TEXT,
  "submissionVersionId" TEXT,
  "message" TEXT,
  "authorVisible" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubmissionEvent_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SubmissionEvent" (
  "id", "submissionId", "type", "submissionVersionId", "authorVisible", "createdAt"
)
SELECT
  gen_random_uuid()::text,
  s.id,
  'SUBMISSION_RECEIVED'::"SubmissionEventType",
  sv.id,
  true,
  s."submittedAt"
FROM "Submission" s
JOIN "SubmissionVersion" sv
  ON sv."submissionId" = s.id AND sv."versionNumber" = 1
WHERE s."submittedAt" IS NOT NULL;

CREATE UNIQUE INDEX "SubmissionVersion_submissionId_versionNumber_key"
  ON "SubmissionVersion"("submissionId", "versionNumber");
CREATE UNIQUE INDEX "SubmissionVersion_manuscriptStoredFileId_key"
  ON "SubmissionVersion"("manuscriptStoredFileId");
CREATE UNIQUE INDEX "SubmissionVersion_responseStoredFileId_key"
  ON "SubmissionVersion"("responseStoredFileId");
CREATE INDEX "SubmissionVersion_submissionId_submittedAt_idx"
  ON "SubmissionVersion"("submissionId", "submittedAt");
CREATE INDEX "ReviewRound_submissionVersionId_idx"
  ON "ReviewRound"("submissionVersionId");
CREATE INDEX "SubmissionEvent_submissionId_createdAt_idx"
  ON "SubmissionEvent"("submissionId", "createdAt");
CREATE INDEX "SubmissionEvent_reviewRoundId_idx"
  ON "SubmissionEvent"("reviewRoundId");
CREATE INDEX "SubmissionEvent_actorId_idx"
  ON "SubmissionEvent"("actorId");

ALTER TABLE "SubmissionVersion"
  ADD CONSTRAINT "SubmissionVersion_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionVersion"
  ADD CONSTRAINT "SubmissionVersion_manuscriptStoredFileId_fkey"
  FOREIGN KEY ("manuscriptStoredFileId") REFERENCES "StoredFile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubmissionVersion"
  ADD CONSTRAINT "SubmissionVersion_responseStoredFileId_fkey"
  FOREIGN KEY ("responseStoredFileId") REFERENCES "StoredFile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReviewRound"
  ADD CONSTRAINT "ReviewRound_submissionVersionId_fkey"
  FOREIGN KEY ("submissionVersionId") REFERENCES "SubmissionVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubmissionEvent"
  ADD CONSTRAINT "SubmissionEvent_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionEvent"
  ADD CONSTRAINT "SubmissionEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubmissionEvent"
  ADD CONSTRAINT "SubmissionEvent_reviewRoundId_fkey"
  FOREIGN KEY ("reviewRoundId") REFERENCES "ReviewRound"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubmissionEvent"
  ADD CONSTRAINT "SubmissionEvent_submissionVersionId_fkey"
  FOREIGN KEY ("submissionVersionId") REFERENCES "SubmissionVersion"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
