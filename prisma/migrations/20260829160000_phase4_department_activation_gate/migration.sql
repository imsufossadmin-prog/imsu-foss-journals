-- CreateTable JournalActivation
CREATE TABLE IF NOT EXISTS "JournalActivation" (
    "journalSlug" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedBy" TEXT,

    CONSTRAINT "JournalActivation_pkey" PRIMARY KEY ("journalSlug")
);
