import "server-only";

import { Prisma, SubmissionRequestStatus } from "@prisma/client";

import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import type { SubmissionAuthorInput } from "@/lib/submissions/types";
import { validateAuthors, validateDetails } from "@/lib/submissions/validation";
import {
  normalizeTrackingId,
  validateMessageBody,
  validateTrackingId,
} from "@/lib/requests/validation";
import { createTrackingNumber } from "@/lib/submissions/tracking";
export class RequestMutationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

async function actorAccess(actorId: string, requestId: string) {
  const [actor, request] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actorId },
      include: {
        globalRoles: true,
        journalRoles: {
          include: { journal: { select: { departmentId: true } } },
        },
      },
    }),
    prisma.submissionRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        authorId: true,
        departmentId: true,
        journalId: true,
        submissionId: true,
        status: true,
      },
    }),
  ]);
  if (!actor?.isActive || !request)
    throw new RequestMutationError("This request is unavailable.");
  const author = request.authorId === actorId;
  const admin =
    isSuperAdmin(actor) ||
    actor.journalRoles.some(
      ({ role, journalId }) =>
        role === "JOURNAL_ADMIN" && journalId === request.journalId,
    );
  if (!author && !admin)
    throw new RequestMutationError("This request is unavailable.");
  return { actor, request, author, admin };
}

async function requireAdmin(actorId: string, requestId: string) {
  const access = await actorAccess(actorId, requestId);
  if (!access.admin)
    throw new RequestMutationError(
      "Only the journal administrator can do that.",
    );
  return access;
}

export async function createSubmissionRequest(
  authorIdOrInput: string | { authorId: string; journalSlug?: string },
  maybeJournalSlug?: string,
) {
  if (typeof authorIdOrInput === "string") {
    return startSubmissionRequest({
      authorId: authorIdOrInput,
      journalSlug: maybeJournalSlug,
    });
  }
  return startSubmissionRequest(authorIdOrInput);
}

export async function startSubmissionRequest({
  authorId,
  journalSlug,
}: {
  authorId: string;
  journalSlug?: string;
}) {
  const targetSlug = journalSlug?.trim() || "psychology";
  const operations = await prisma.journal.findFirst({
    where: {
      slug: targetSlug,
      isActive: true,
      OR: [{ departmentId: null }, { department: { isActive: true } }],
    },
    select: {
      id: true,
      name: true,
      departmentId: true,
      department: { select: { name: true } },
    },
  });
  if (!operations)
    throw new RequestMutationError(
      "Journal operations for this journal are not available yet.",
    );

  const existing = await prisma.submissionRequest.findFirst({
    where: {
      authorId,
      journalId: operations.id,
      status: { not: "TRACKING_ASSIGNED" },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (existing) return existing;

  const teamName = operations.department?.name ?? operations.name;
  return prisma.submissionRequest.create({
    data: {
      authorId,
      departmentId: operations.departmentId,
      journalId: operations.id,
      messages: {
        create: {
          kind: "SYSTEM",
          body: `Submission request started. The ${teamName} journal team can now assist you here.`,
        },
      },
    },
    select: { id: true },
  });
}

export async function sendRequestMessage(input: {
  actorId: string;
  requestId: string;
  body: string;
}) {
  const error = validateMessageBody(input.body);
  if (error) throw new RequestMutationError(error, { body: error });
  const { request } = await actorAccess(input.actorId, input.requestId);
  await prisma.$transaction(async (transaction) => {
    await transaction.submissionConversationMessage.create({
      data: {
        requestId: request.id,
        senderId: input.actorId,
        body: input.body.trim(),
      },
    });
    await transaction.submissionRequest.update({
      where: { id: request.id },
      data: { updatedAt: new Date() },
    });
  });
}

export async function confirmPaymentAndEnableSubmission(
  actorId: string,
  requestId: string,
) {
  const { request } = await requireAdmin(actorId, requestId);
  const activatableStatuses: SubmissionRequestStatus[] = [
    "NEW",
    "AWAITING_PAYMENT",
    "RECEIPT_SUBMITTED",
  ];
  if (!activatableStatuses.includes(request.status)) {
    throw new RequestMutationError(
      "Submission has already been enabled for this request.",
    );
  }
  const now = new Date();
  try {
    return await prisma.submissionRequest.update({
      where: {
        id: request.id,
        status: { in: activatableStatuses },
      },
      data: {
        status: "SUBMISSION_ENABLED",
        paymentConfirmedAt: now,
        paymentConfirmedById: actorId,
        submissionEnabledAt: now,
        submissionEnabledById: actorId,
        version: { increment: 1 },
        messages: {
          create: {
            kind: "SYSTEM",
            body: "Submission request active. Article submission is available.",
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new RequestMutationError(
        "This request changed. Refresh and try again.",
      );
    }
    throw error;
  }
}

export async function beginRequestSubmission(
  authorId: string,
  requestId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const request = await transaction.submissionRequest.findFirst({
      where: { id: requestId, authorId },
      select: { id: true, journalId: true, submissionId: true },
    });
    if (!request)
      throw new RequestMutationError("This submission request is unavailable.");
    if (request.submissionId) return { id: request.submissionId };
    const submission = await transaction.submission.create({
      data: { ownerId: authorId, journalId: request.journalId },
    });
    await transaction.submissionRequest.update({
      where: { id: request.id },
      data: { submissionId: submission.id, version: { increment: 1 } },
    });
    return { id: submission.id };
  });
}

export async function saveSimpleArticle(input: {
  authorId: string;
  requestId: string;
  submissionId: string;
  version: number;
  title: string;
  abstract: string;
  keywords: string[];
  authors: SubmissionAuthorInput[];
}) {
  const details = validateDetails(input);
  const authors = validateAuthors(input.authors);
  const fieldErrors = { ...details.fieldErrors, ...authors.fieldErrors };
  if (!details.valid || !authors.valid)
    throw new RequestMutationError(
      "Review the highlighted article information.",
      fieldErrors,
    );
  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.submission.updateMany({
      where: {
        id: input.submissionId,
        ownerId: input.authorId,
        status: "DRAFT",
        request: {
          id: input.requestId,
          authorId: input.authorId,
        },
      },
      data: {
        title: input.title.trim(),
        abstract: input.abstract.trim(),
        keywords: input.keywords,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1)
      throw new RequestMutationError(
        "This article changed. Refresh before saving again.",
      );
    await transaction.submissionAuthor.deleteMany({
      where: { submissionId: input.submissionId },
    });
    await transaction.submissionAuthor.createMany({
      data: input.authors.map((author, index) => ({
        submissionId: input.submissionId,
        fullName: author.fullName.trim(),
        email: author.email.trim() || null,
        affiliation: author.affiliation.trim() || null,
        orcid: null,
        position: index + 1,
        isCorrespondingAuthor: author.isCorrespondingAuthor,
      })),
    });
  });
}

export async function finalizeRequestSubmission(
  authorId: string,
  requestId: string,
  submissionId: string,
) {
  await prisma.$transaction(async (transaction) => {
    const request = await transaction.submissionRequest.findFirst({
      where: {
        id: requestId,
        authorId,
        submissionId,
      },
      include: {
        submission: {
          include: {
            authors: true,
            files: { include: { storedFile: true } },
            journal: true,
          },
        },
      },
    });
    const submission = request?.submission;
    if (!request || !submission || submission.status !== "DRAFT") {
      throw new RequestMutationError("This article is not ready to submit.");
    }
    const details = validateDetails({
      title: submission.title ?? "",
      abstract: submission.abstract ?? "",
      keywords: submission.keywords,
    });
    const authors = validateAuthors(
      submission.authors.map((author) => ({
        fullName: author.fullName,
        email: author.email ?? "",
        affiliation: author.affiliation ?? "",
        orcid: "",
        isCorrespondingAuthor: author.isCorrespondingAuthor,
      })),
    );
    const manuscript = submission.files.find(
      ({ type }) => type === "MANUSCRIPT",
    );
    if (!details.valid || !authors.valid || !manuscript) {
      throw new RequestMutationError(
        "Add the article information and manuscript before submitting.",
      );
    }
    const now = new Date();
    const updated = await transaction.submission.updateMany({
      where: {
        id: submission.id,
        ownerId: authorId,
        status: "DRAFT",
        trackingNumber: null,
      },
      data: {
        status: "SUBMITTED",
        submittedAt: now,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1)
      throw new RequestMutationError(
        "This article changed. Refresh before submitting.",
      );
    const version = await transaction.submissionVersion.create({
      data: {
        submissionId: submission.id,
        versionNumber: 1,
        kind: "ORIGINAL",
        manuscriptStoredFileId: manuscript.storedFileId,
        submittedAt: now,
      },
    });
    await transaction.submissionEvent.create({
      data: {
        submissionId: submission.id,
        submissionVersionId: version.id,
        type: "SUBMISSION_RECEIVED",
        actorId: authorId,
        authorVisible: true,
        createdAt: now,
      },
    });
    await transaction.submissionRequest.update({
      where: { id: request.id },
      data: { status: "MANUSCRIPT_SUBMITTED", version: { increment: 1 } },
    });
    await transaction.submissionConversationMessage.create({
      data: {
        requestId: request.id,
        kind: "SYSTEM",
        body: "Manuscript received. The journal administrator will assign its tracking ID.",
      },
    });
  });
}

export async function assignTrackingIdBySubmissionId(input: {
  actorId: string;
  journalId: string;
  submissionId: string;
  trackingId?: string;
}) {
  const submission = await prisma.submission.findFirst({
    where: { id: input.submissionId, journalId: input.journalId },
    select: {
      id: true,
      journalId: true,
      journal: { select: { id: true, name: true, shortName: true } },
      trackingNumber: true,
      request: { select: { id: true } },
    },
  });
  if (!submission) throw new RequestMutationError("Submission not found.");

  const rawId = input.trackingId?.trim();
  let trackingId = "";

  if (rawId) {
    const validation = validateTrackingId(rawId);
    if (validation)
      throw new RequestMutationError(validation, { trackingId: validation });
    trackingId = normalizeTrackingId(rawId);
  } else {
    const count = await prisma.submission.count({
      where: {
        journalId: submission.journalId,
        trackingNumber: { not: null },
      },
    });
    trackingId = createTrackingNumber({
      journalId: submission.journal.id,
      journalName: submission.journal.name,
      journalShortName: submission.journal.shortName,
      year: new Date().getFullYear(),
      sequence: count + 1,
    });
  }

  const now = new Date();
  try {
    await prisma.submission.update({
      where: { id: submission.id, journalId: input.journalId },
      data: {
        trackingNumber: trackingId,
        version: { increment: 1 },
        request: submission.request
          ? {
              update: {
                where: { id: submission.request.id },
                data: {
                  status: "TRACKING_ASSIGNED",
                  trackingAssignedAt: now,
                  trackingAssignedById: input.actorId,
                  version: { increment: 1 },
                  messages: {
                    create: {
                      kind: "SYSTEM",
                      body: `Tracking ID assigned: ${trackingId}`,
                    },
                  },
                },
              },
            }
          : undefined,
        events: {
          create: {
            type: "TRACKING_ID_ASSIGNED",
            actorId: input.actorId,
            authorVisible: true,
            message: `Tracking ID: ${trackingId}`,
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new RequestMutationError("That tracking ID is already in use.", {
        trackingId: "Enter a unique tracking ID.",
      });
    }
    throw error;
  }
}

export async function assignTrackingId(input: {
  actorId: string;
  requestId: string;
  trackingId: string;
}) {
  const { request } = await requireAdmin(input.actorId, input.requestId);
  if (!request.submissionId) {
    throw new RequestMutationError("This request has no submitted manuscript.");
  }
  await assignTrackingIdBySubmissionId({
    actorId: input.actorId,
    journalId: request.journalId,
    submissionId: request.submissionId,
    trackingId: input.trackingId,
  });
}
