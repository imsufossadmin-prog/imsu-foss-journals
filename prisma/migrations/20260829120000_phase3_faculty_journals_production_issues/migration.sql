-- AlterEnum
ALTER TYPE "ArticleFileType" ADD VALUE IF NOT EXISTS 'PRODUCTION_FILE';

-- AlterTable Journal: make departmentId nullable
ALTER TABLE "Journal" ALTER COLUMN "departmentId" DROP NOT NULL;

-- Update foreign key constraint on Journal for onDelete: SetNull
ALTER TABLE "Journal" DROP CONSTRAINT IF EXISTS "Journal_departmentId_fkey";
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable SubmissionRequest: make departmentId nullable
ALTER TABLE "SubmissionRequest" ALTER COLUMN "departmentId" DROP NOT NULL;

-- Update foreign key constraint on SubmissionRequest for onDelete: SetNull
ALTER TABLE "SubmissionRequest" DROP CONSTRAINT IF EXISTS "SubmissionRequest_departmentId_fkey";
ALTER TABLE "SubmissionRequest" ADD CONSTRAINT "SubmissionRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Issue: add isClosed, closedAt, closedById
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "isClosed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "closedById" UUID;
