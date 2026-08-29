import "server-only";

import type { Prisma } from "@prisma/client";

import type {
  AuthorSubmissionDTO,
  SubmissionFileDTO,
} from "@/lib/submissions/types";
import { prisma } from "@/lib/db/prisma";

const authorSubmissionInclude = {
  journal: {
    select: {
      id: true,
      name: true,
      shortName: true,
      slug: true,
      description: true,
      isActive: true,
      department: { select: { name: true, isActive: true } },
    },
  },
  request: { select: { id: true } },
  authors: { orderBy: { position: "asc" as const } },
  files: {
    orderBy: { createdAt: "asc" as const },
    include: { storedFile: true },
  },
} satisfies Prisma.SubmissionInclude;

type SubmissionRecord = Prisma.SubmissionGetPayload<{
  include: typeof authorSubmissionInclude;
}>;

function fileDTO(file: SubmissionRecord["files"][number]): SubmissionFileDTO {
  return {
    id: file.id,
    type: file.type as SubmissionFileDTO["type"],
    originalFileName: file.storedFile.originalFileName,
    mimeType: file.storedFile.mimeType,
    sizeBytes: Number(file.storedFile.sizeBytes),
    createdAt: file.createdAt,
  };
}

export function submissionDTO(record: SubmissionRecord): AuthorSubmissionDTO {
  return {
    id: record.id,
    trackingNumber: record.trackingNumber,
    title: record.title,
    abstract: record.abstract,
    keywords: record.keywords,
    status: record.status,
    version: record.version,
    declarationAccuracy: record.declarationAccuracy,
    declarationAuthority: record.declarationAuthority,
    declarationReadiness: record.declarationReadiness,
    submittedAt: record.submittedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    journal: record.journal,
    request: record.request ? { id: record.request.id } : null,
    authors: record.authors.map((author) => ({
      id: author.id,
      position: author.position,
      fullName: author.fullName,
      email: author.email ?? "",
      affiliation: author.affiliation ?? "",
      orcid: author.orcid ?? "",
      isCorrespondingAuthor: author.isCorrespondingAuthor,
    })),
    files: record.files.filter(({ type }) => type !== "REVISION").map(fileDTO),
  };
}

export async function listAuthorSubmissions(ownerId: string, take?: number) {
  const submissions = await prisma.submission.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    take,
    include: authorSubmissionInclude,
  });

  return submissions.map(submissionDTO);
}

export async function getAuthorSubmission(ownerId: string, id: string) {
  const submission = await prisma.submission.findFirst({
    where: { id, ownerId },
    include: authorSubmissionInclude,
  });

  return submission ? submissionDTO(submission) : null;
}

export async function getEligibleJournals() {
  return prisma.journal.findMany({
    where: {
      isActive: true,
      OR: [{ departmentId: null }, { department: { isActive: true } }],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      shortName: true,
      slug: true,
      description: true,
      department: { select: { name: true, isActive: true } },
    },
  });
}
