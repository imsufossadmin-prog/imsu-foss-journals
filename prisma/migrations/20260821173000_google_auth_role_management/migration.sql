-- CreateEnum
CREATE TYPE "ManagedRole" AS ENUM ('SUPER_ADMIN', 'JOURNAL_ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "RoleChangeAction" AS ENUM ('ASSIGNED', 'REMOVED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "email" TEXT;

-- CreateTable
CREATE TABLE "RoleChangeEvent" (
    "id" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "role" "ManagedRole" NOT NULL,
    "action" "RoleChangeAction" NOT NULL,
    "journalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleChangeEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RoleChangeEvent_role_scope_check" CHECK (
        ("role" = 'SUPER_ADMIN' AND "journalId" IS NULL)
        OR
        ("role" IN ('JOURNAL_ADMIN', 'EDITOR') AND "journalId" IS NOT NULL)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "RoleChangeEvent_actorId_createdAt_idx" ON "RoleChangeEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "RoleChangeEvent_targetUserId_createdAt_idx" ON "RoleChangeEvent"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "RoleChangeEvent_journalId_createdAt_idx" ON "RoleChangeEvent"("journalId", "createdAt");

-- AddForeignKey
ALTER TABLE "RoleChangeEvent" ADD CONSTRAINT "RoleChangeEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleChangeEvent" ADD CONSTRAINT "RoleChangeEvent_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleChangeEvent" ADD CONSTRAINT "RoleChangeEvent_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
