import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export async function getPsychologyOperations() {
  return prisma.journal.findFirst({
    where: {
      slug: "psychology",
      isActive: true,
      department: { slug: "psychology", isActive: true },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      shortName: true,
      department: { select: { id: true, slug: true, name: true } },
    },
  });
}

const requestListSelect = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true, slug: true } },
  journal: { select: { id: true, name: true, slug: true } },
  author: { select: { id: true, displayName: true } },
  submission: {
    select: { id: true, title: true, trackingNumber: true, status: true },
  },
  _count: { select: { messages: true } },
} as const;

export function listAuthorRequests(authorId: string) {
  return prisma.submissionRequest.findMany({
    where: { authorId },
    orderBy: { updatedAt: "desc" },
    select: requestListSelect,
  });
}

export function listDepartmentRequests(departmentId: string) {
  return prisma.submissionRequest.findMany({
    where: { departmentId },
    orderBy: { updatedAt: "desc" },
    select: requestListSelect,
  });
}

export function listJournalRequests(journalId: string) {
  return prisma.submissionRequest.findMany({
    where: { journalId },
    orderBy: { updatedAt: "desc" },
    select: requestListSelect,
  });
}

export function listAllPlatformRequests(departmentSlug?: string) {
  return prisma.submissionRequest.findMany({
    where: departmentSlug ? { journal: { slug: departmentSlug } } : undefined,
    orderBy: { updatedAt: "desc" },
    select: requestListSelect,
  });
}

const requestDetailInclude = {
  department: { select: { id: true, name: true, slug: true } },
  journal: { select: { id: true, name: true, slug: true } },
  author: { select: { id: true, displayName: true } },
  submission: {
    include: {
      authors: { orderBy: { position: "asc" as const } },
      files: { include: { storedFile: true } },
      manuscriptVersions: {
        orderBy: { versionNumber: "desc" as const },
        take: 1,
        select: { id: true },
      },
    },
  },
  messages: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      sender: { select: { id: true, displayName: true } },
      attachments: { include: { storedFile: true } },
    },
  },
} satisfies Prisma.SubmissionRequestInclude;

export function getAuthorRequest(authorId: string, requestId: string) {
  return prisma.submissionRequest.findFirst({
    where: { id: requestId, authorId },
    include: requestDetailInclude,
  });
}

export function getDepartmentRequest(departmentId: string, requestId: string) {
  return prisma.submissionRequest.findFirst({
    where: { id: requestId, departmentId },
    include: requestDetailInclude,
  });
}

export function getJournalRequest(journalId: string, requestId: string) {
  return prisma.submissionRequest.findFirst({
    where: { id: requestId, journalId },
    include: requestDetailInclude,
  });
}

export function getRequestSubmission(authorId: string, requestId: string) {
  return prisma.submissionRequest.findFirst({
    where: { id: requestId, authorId },
    select: {
      id: true,
      status: true,
      submission: {
        include: {
          journal: { include: { department: true } },
          authors: { orderBy: { position: "asc" } },
          files: {
            orderBy: { createdAt: "asc" },
            include: { storedFile: true },
          },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Platform-level dashboard queries (Super Admin operating center)
// ---------------------------------------------------------------------------

export async function getPlatformOperationalCounts() {
  const [
    newRequests,
    pendingReceipts,
    awaitingTracking,
    readyForPublishing,
    publishedArticles,
  ] = await Promise.all([
    prisma.submissionRequest.count({ where: { status: "NEW" } }),
    prisma.submissionRequest.count({
      where: { status: "RECEIPT_SUBMITTED" },
    }),
    prisma.submissionRequest.count({
      where: { status: "MANUSCRIPT_SUBMITTED" },
    }),
    prisma.submission.count({
      where: { status: { in: ["ACCEPTED", "REVIEWS_RECEIVED"] } },
    }),
    prisma.article.count({ where: { isPublished: true } }),
  ]);
  return {
    newRequests,
    pendingReceipts,
    awaitingTracking,
    readyForPublishing,
    publishedArticles,
  };
}

export async function getPlatformStaffCounts() {
  const [journalAdmins, editors] = await Promise.all([
    prisma.journalRoleAssignment.count({
      where: { role: "JOURNAL_ADMIN", journal: { isActive: true } },
    }),
    prisma.journalRoleAssignment.count({
      where: { role: "EDITOR", journal: { isActive: true } },
    }),
  ]);
  return { journalAdmins, editors };
}

export async function getActiveJournals() {
  const journals = await prisma.journal.findMany({
    where: {
      isActive: true,
      OR: [{ departmentId: null }, { department: { isActive: true } }],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      shortName: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  return journals.sort((a, b) => {
    if (a.slug === "psychology") return -1;
    if (b.slug === "psychology") return 1;
    return a.name.localeCompare(b.name);
  });
}

export const getActiveDepartmentJournals = getActiveJournals;
