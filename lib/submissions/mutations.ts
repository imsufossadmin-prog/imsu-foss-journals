import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { finalizeRequestSubmission } from "@/lib/requests/mutations";
import type { SubmissionAuthorInput } from "@/lib/submissions/types";
import { validateAuthors, validateDetails } from "@/lib/submissions/validation";

export class SubmissionMutationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

async function assertActiveJournal(journalId: string) {
  const journal = await prisma.journal.findFirst({
    where: {
      id: journalId,
      isActive: true,
      OR: [{ departmentId: null }, { department: { isActive: true } }],
    },
    select: { id: true },
  });
  if (!journal) {
    throw new SubmissionMutationError(
      "That journal is not currently accepting submissions.",
    );
  }
}

async function updateDraftVersion(input: {
  ownerId: string;
  submissionId: string;
  version: number;
  data: Prisma.SubmissionUncheckedUpdateManyInput;
}) {
  const updated = await prisma.submission.updateMany({
    where: {
      id: input.submissionId,
      ownerId: input.ownerId,
      status: "DRAFT",
      version: input.version,
    },
    data: { ...input.data, version: { increment: 1 } },
  });

  if (updated.count !== 1) {
    throw new SubmissionMutationError(
      "This draft changed in another window. Refresh before saving again.",
    );
  }
}

export async function createDraft(ownerId: string, journalId: string) {
  await assertActiveJournal(journalId);
  const recentThreshold = new Date(Date.now() - 10 * 60 * 1000);
  const existing = await prisma.submission.findFirst({
    where: {
      ownerId,
      journalId,
      status: "DRAFT",
      title: null,
      createdAt: { gte: recentThreshold },
      authors: { none: {} },
      files: { none: {} },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (existing) return existing;

  return prisma.submission.create({
    data: { ownerId, journalId },
    select: { id: true },
  });
}

export async function changeDraftJournal(input: {
  ownerId: string;
  submissionId: string;
  journalId: string;
  version: number;
}) {
  await assertActiveJournal(input.journalId);
  await updateDraftVersion({
    ...input,
    data: { journalId: input.journalId },
  });
}

export async function saveDraftDetails(input: {
  ownerId: string;
  submissionId: string;
  version: number;
  title: string;
  abstract: string;
  keywords: string[];
}) {
  const validation = validateDetails(input);
  if (!validation.valid) {
    throw new SubmissionMutationError(
      "Review the highlighted manuscript details.",
      validation.fieldErrors,
    );
  }

  await updateDraftVersion({
    ...input,
    data: {
      title: input.title.trim(),
      abstract: input.abstract.trim(),
      keywords: input.keywords,
    },
  });
}

export async function saveDraftAuthors(input: {
  ownerId: string;
  submissionId: string;
  version: number;
  authors: SubmissionAuthorInput[];
}) {
  const validation = validateAuthors(input.authors);
  if (!validation.valid) {
    throw new SubmissionMutationError(
      "Review the highlighted author information.",
      validation.fieldErrors,
    );
  }

  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.submission.updateMany({
      where: {
        id: input.submissionId,
        ownerId: input.ownerId,
        status: "DRAFT",
        version: input.version,
      },
      data: { version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new SubmissionMutationError(
        "This draft changed in another window. Refresh before saving again.",
      );
    }

    await transaction.submissionAuthor.deleteMany({
      where: { submissionId: input.submissionId },
    });
    await transaction.submissionAuthor.createMany({
      data: input.authors.map((author, index) => ({
        submissionId: input.submissionId,
        fullName: author.fullName.trim(),
        email: author.email.trim() || null,
        affiliation: author.affiliation.trim() || null,
        orcid: author.orcid.trim().toUpperCase() || null,
        position: index + 1,
        isCorrespondingAuthor: author.isCorrespondingAuthor,
      })),
    });
  });
}

export async function saveDraftDeclarations(input: {
  ownerId: string;
  submissionId: string;
  version: number;
  declarationAccuracy: boolean;
  declarationAuthority: boolean;
  declarationReadiness: boolean;
}) {
  if (
    !input.declarationAccuracy ||
    !input.declarationAuthority ||
    !input.declarationReadiness
  ) {
    throw new SubmissionMutationError(
      "Confirm all three declarations before continuing.",
    );
  }

  await updateDraftVersion({
    ...input,
    data: {
      declarationAccuracy: input.declarationAccuracy,
      declarationAuthority: input.declarationAuthority,
      declarationReadiness: input.declarationReadiness,
    },
  });
}

export async function finalizeSubmission(
  ownerId: string,
  submissionId: string,
) {
  const request = await prisma.submissionRequest.findFirst({
    where: { authorId: ownerId, submissionId },
    select: { id: true },
  });
  if (!request) {
    throw new SubmissionMutationError(
      "Start with a submission request and wait for permission from the journal.",
    );
  }
  await finalizeRequestSubmission(ownerId, request.id, submissionId);
  return { trackingNumber: null };
}

export async function getDraftFilesForDeletion(
  ownerId: string,
  submissionId: string,
) {
  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, ownerId, status: "DRAFT" },
    select: {
      id: true,
      files: {
        select: {
          storedFileId: true,
          storedFile: { select: { bucket: true, objectPath: true } },
        },
      },
    },
  });
  if (!submission) {
    throw new SubmissionMutationError("Only your drafts can be deleted.");
  }
  return submission.files;
}

export async function getDraftFileForRemoval(input: {
  ownerId: string;
  submissionId: string;
  submissionFileId: string;
}) {
  const file = await prisma.submissionFile.findFirst({
    where: {
      id: input.submissionFileId,
      submissionId: input.submissionId,
      submission: { ownerId: input.ownerId, status: "DRAFT" },
    },
    select: {
      id: true,
      storedFileId: true,
      storedFile: { select: { bucket: true, objectPath: true } },
    },
  });
  if (!file) {
    throw new SubmissionMutationError("That draft file is unavailable.");
  }
  return file;
}

export async function deleteDraftFileRecord(input: {
  ownerId: string;
  submissionId: string;
  submissionFileId: string;
  storedFileId: string;
  version: number;
}) {
  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.submission.updateMany({
      where: {
        id: input.submissionId,
        ownerId: input.ownerId,
        status: "DRAFT",
        version: input.version,
      },
      data: { version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new SubmissionMutationError(
        "This draft changed in another window. Refresh before removing the file.",
      );
    }
    const deleted = await transaction.submissionFile.deleteMany({
      where: {
        id: input.submissionFileId,
        submissionId: input.submissionId,
      },
    });
    if (deleted.count !== 1) {
      throw new SubmissionMutationError("That draft file is unavailable.");
    }
    await transaction.storedFile.delete({
      where: { id: input.storedFileId },
    });
  });
}

export async function deleteDraftRecord(
  ownerId: string,
  submissionId: string,
  storedFileIds: string[],
) {
  await prisma.$transaction(async (transaction) => {
    const linkedRequest = await transaction.submissionRequest.findFirst({
      where: { submissionId, authorId: ownerId },
      select: { id: true },
    });

    const deleted = await transaction.submission.deleteMany({
      where: { id: submissionId, ownerId, status: "DRAFT" },
    });
    if (deleted.count !== 1) {
      throw new SubmissionMutationError("Only your drafts can be deleted.");
    }

    if (linkedRequest) {
      await transaction.submissionRequest.update({
        where: { id: linkedRequest.id },
        data: {
          submissionId: null,
          status: "SUBMISSION_ENABLED",
        },
      });
    }

    await transaction.storedFile.deleteMany({
      where: { id: { in: storedFileIds } },
    });
  });
}
