import "server-only";

import { prisma } from "@/lib/db/prisma";
import { isSuperAdmin } from "@/lib/auth/permissions";

export class IssueMutationError extends Error {}

async function assertJournalAdmin(adminId: string, journalId: string) {
  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      isActive: true,
      globalRoles: { select: { role: true } },
      journalRoles: { select: { journalId: true, role: true } },
    },
  });

  if (!user || !user.isActive) {
    throw new IssueMutationError("Your account is not authorized.");
  }

  const authorized =
    isSuperAdmin(user) ||
    user.journalRoles.some(
      (r) => r.journalId === journalId && r.role === "JOURNAL_ADMIN",
    );

  if (!authorized) {
    throw new IssueMutationError(
      "Only an authorized Journal Administrator can manage issues.",
    );
  }

  return user;
}

export async function closeIssue(input: {
  adminId: string;
  issueId: string;
  journalId?: string;
}) {
  const issue = await prisma.issue.findUnique({
    where: { id: input.issueId },
    include: { volume: true },
  });

  if (!issue) {
    throw new IssueMutationError("Issue not found.");
  }

  const targetJournalId = input.journalId ?? issue.volume.journalId;
  await assertJournalAdmin(input.adminId, targetJournalId);

  return prisma.issue.update({
    where: { id: issue.id },
    data: {
      isClosed: true,
      closedAt: new Date(),
      closedById: input.adminId,
    },
  });
}

export async function reopenIssue(input: {
  adminId: string;
  issueId: string;
  journalId?: string;
}) {
  const issue = await prisma.issue.findUnique({
    where: { id: input.issueId },
    include: { volume: true },
  });

  if (!issue) {
    throw new IssueMutationError("Issue not found.");
  }

  const targetJournalId = input.journalId ?? issue.volume.journalId;
  await assertJournalAdmin(input.adminId, targetJournalId);

  return prisma.issue.update({
    where: { id: issue.id },
    data: {
      isClosed: false,
      closedAt: null,
      closedById: null,
    },
  });
}

export async function publishIssueTOC(input: {
  adminId: string;
  issueId: string;
}) {
  const issue = await prisma.issue.findUnique({
    where: { id: input.issueId },
    include: { volume: true },
  });

  if (!issue) {
    throw new IssueMutationError("Issue not found.");
  }

  await assertJournalAdmin(input.adminId, issue.volume.journalId);

  return prisma.issue.update({
    where: { id: issue.id },
    data: {
      isPublished: true,
      publishedAt: issue.publishedAt ?? new Date(),
    },
  });
}

export async function getIssueTOCData(issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      volume: {
        include: {
          journal: {
            select: {
              id: true,
              name: true,
              shortName: true,
              slug: true,
              institution: true,
              faculty: true,
              department: { select: { name: true } },
            },
          },
        },
      },
      articles: {
        where: { isPublished: true },
        orderBy: [
          { issueOrder: "asc" },
          { pageStart: "asc" },
          { createdAt: "asc" },
        ],
        include: {
          authors: { orderBy: { position: "asc" } },
          files: {
            include: { storedFile: true },
          },
        },
      },
    },
  });

  return issue;
}
