import "server-only";

import {
  Prisma,
  type EditorialDecisionType,
  type ReviewRecommendation,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  decisionSubmissionStatus,
  isRevisionDecision,
  minimumCompletedReviews,
  type ReviewFormInput,
  validateReview,
} from "@/lib/editorial/validation";

export class EditorialMutationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

async function assertJournalAdmin(userId: string, journalId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      OR: [
        { globalRoles: { some: { role: "SUPER_ADMIN" } } },
        { journalRoles: { some: { journalId, role: "JOURNAL_ADMIN" } } },
      ],
    },
    select: { id: true },
  });
  if (!user) throw new EditorialMutationError("Journal access was denied.");
}

export async function beginInitialAssessment(input: {
  adminId: string;
  journalId: string;
  submissionId: string;
}) {
  await assertJournalAdmin(input.adminId, input.journalId);
  const updated = await prisma.submission.updateMany({
    where: {
      id: input.submissionId,
      journalId: input.journalId,
      trackingNumber: { not: null },
      status: { in: ["SUBMITTED", "REVISED"] },
    },
    data: { status: "SCREENING", version: { increment: 1 } },
  });
  if (updated.count !== 1) {
    throw new EditorialMutationError(
      "Assign a tracking ID before starting editorial assessment.",
    );
  }
  await prisma.submissionEvent.create({
    data: {
      submissionId: input.submissionId,
      actorId: input.adminId,
      type: "INITIAL_ASSESSMENT_STARTED",
      authorVisible: true,
    },
  });
}

export async function returnForCorrection(input: {
  adminId: string;
  journalId: string;
  submissionId: string;
  message: string;
}) {
  await assertJournalAdmin(input.adminId, input.journalId);
  const message = input.message.trim();
  if (!message) {
    throw new EditorialMutationError("Explain what the author must correct.", {
      message: "Correction guidance is required.",
    });
  }
  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.submission.updateMany({
      where: {
        id: input.submissionId,
        journalId: input.journalId,
        status: "SCREENING",
      },
      data: { status: "CORRECTION_REQUESTED", version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new EditorialMutationError(
        "This manuscript is no longer in initial assessment.",
      );
    }
    await transaction.submissionEvent.create({
      data: {
        submissionId: input.submissionId,
        actorId: input.adminId,
        type: "CORRECTION_REQUESTED",
        message,
        authorVisible: true,
      },
    });
  });
}

export async function passInitialAssessment(input: {
  adminId: string;
  journalId: string;
  submissionId: string;
}) {
  await assertJournalAdmin(input.adminId, input.journalId);
  return prisma.$transaction(async (transaction) => {
    const submission = await transaction.submission.findFirst({
      where: {
        id: input.submissionId,
        journalId: input.journalId,
        status: "SCREENING",
      },
      select: {
        id: true,
        manuscriptVersions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: { id: true },
        },
        reviewRounds: {
          orderBy: { roundNumber: "desc" },
          take: 1,
          select: { roundNumber: true, submissionVersionId: true },
        },
      },
    });
    const manuscriptVersion = submission?.manuscriptVersions[0];
    if (!submission || !manuscriptVersion) {
      throw new EditorialMutationError(
        "A preserved manuscript version is required before review.",
      );
    }
    if (
      submission.reviewRounds[0]?.submissionVersionId === manuscriptVersion.id
    ) {
      throw new EditorialMutationError(
        "This manuscript version already has a review round.",
      );
    }
    const round = await transaction.reviewRound.create({
      data: {
        submissionId: submission.id,
        submissionVersionId: manuscriptVersion.id,
        roundNumber: (submission.reviewRounds[0]?.roundNumber ?? 0) + 1,
        status: "PLANNED",
      },
      select: { id: true, roundNumber: true },
    });
    await transaction.submission.update({
      where: { id: submission.id },
      data: { status: "AWAITING_REVIEWERS", version: { increment: 1 } },
    });
    await transaction.submissionEvent.createMany({
      data: [
        {
          submissionId: submission.id,
          actorId: input.adminId,
          submissionVersionId: manuscriptVersion.id,
          reviewRoundId: round.id,
          type: "INITIAL_ASSESSMENT_PASSED",
          authorVisible: true,
        },
        {
          submissionId: submission.id,
          actorId: input.adminId,
          submissionVersionId: manuscriptVersion.id,
          reviewRoundId: round.id,
          type: "REVIEW_ROUND_OPENED",
          message: `Review round ${round.roundNumber}`,
          authorVisible: true,
        },
      ],
    });
    return round;
  });
}

export async function assignReviewer(input: {
  adminId: string;
  journalId: string;
  submissionId: string;
  editorId: string;
  dueAt?: Date | null;
}) {
  await assertJournalAdmin(input.adminId, input.journalId);
  if (input.adminId === input.editorId) {
    throw new EditorialMutationError(
      "The handling administrator cannot review this manuscript.",
    );
  }
  const editor = await prisma.user.findFirst({
    where: {
      id: input.editorId,
      isActive: true,
      journalRoles: {
        some: { journalId: input.journalId, role: "EDITOR" },
      },
    },
    select: { id: true },
  });
  if (!editor) {
    throw new EditorialMutationError(
      "Choose an active editor assigned to this journal.",
    );
  }

  return prisma.$transaction(async (transaction) => {
    const submission = await transaction.submission.findFirst({
      where: {
        id: input.submissionId,
        journalId: input.journalId,
        status: { in: ["AWAITING_REVIEWERS", "UNDER_REVIEW"] },
      },
      select: {
        id: true,
        reviewRounds: {
          where: { status: { in: ["PLANNED", "ACTIVE"] } },
          orderBy: { roundNumber: "desc" },
          take: 1,
          select: { id: true, status: true },
        },
      },
    });
    const round = submission?.reviewRounds[0];
    if (!submission || !round) {
      throw new EditorialMutationError("No open review round was found.");
    }
    let assignment;
    try {
      assignment = await transaction.reviewAssignment.create({
        data: {
          reviewRoundId: round.id,
          editorId: editor.id,
          dueAt: input.dueAt ?? null,
        },
        select: { id: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new EditorialMutationError(
          "That editor is already assigned to this round.",
        );
      }
      throw error;
    }
    const activeCount = await transaction.reviewAssignment.count({
      where: {
        reviewRoundId: round.id,
        status: { notIn: ["CANCELLED", "DECLINED"] },
      },
    });
    if (activeCount >= minimumCompletedReviews) {
      await transaction.reviewRound.update({
        where: { id: round.id },
        data: {
          status: "ACTIVE",
          ...(round.status === "PLANNED" ? { openedAt: new Date() } : {}),
        },
      });
      await transaction.submission.update({
        where: { id: submission.id },
        data: { status: "UNDER_REVIEW", version: { increment: 1 } },
      });
    }
    await transaction.submissionEvent.create({
      data: {
        submissionId: submission.id,
        actorId: input.adminId,
        reviewRoundId: round.id,
        type: "REVIEWER_ASSIGNED",
      },
    });
    return assignment;
  });
}

export async function cancelReviewerAssignment(input: {
  adminId: string;
  journalId: string;
  submissionId: string;
  assignmentId: string;
}) {
  await assertJournalAdmin(input.adminId, input.journalId);
  await prisma.$transaction(async (transaction) => {
    const assignment = await transaction.reviewAssignment.findFirst({
      where: {
        id: input.assignmentId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        reviewRound: {
          submissionId: input.submissionId,
          submission: { journalId: input.journalId },
        },
      },
      select: { id: true, reviewRoundId: true },
    });
    if (!assignment) {
      throw new EditorialMutationError(
        "A completed or unavailable assignment cannot be cancelled.",
      );
    }
    await transaction.reviewAssignment.update({
      where: { id: assignment.id },
      data: { status: "CANCELLED", respondedAt: new Date() },
    });
    const activeCount = await transaction.reviewAssignment.count({
      where: {
        reviewRoundId: assignment.reviewRoundId,
        status: { notIn: ["CANCELLED", "DECLINED"] },
      },
    });
    if (activeCount < minimumCompletedReviews) {
      await transaction.reviewRound.update({
        where: { id: assignment.reviewRoundId },
        data: { status: "PLANNED" },
      });
      await transaction.submission.update({
        where: { id: input.submissionId },
        data: { status: "AWAITING_REVIEWERS", version: { increment: 1 } },
      });
    }
    await transaction.submissionEvent.create({
      data: {
        submissionId: input.submissionId,
        actorId: input.adminId,
        reviewRoundId: assignment.reviewRoundId,
        type: "REVIEWER_CANCELLED",
      },
    });
  });
}

export async function saveEditorReview(input: {
  editorId: string;
  journalId: string;
  assignmentId: string;
  reviewVersion: number;
  final: boolean;
  review: ReviewFormInput;
}) {
  const validation = validateReview(input.review, input.final);
  if (!validation.valid) {
    throw new EditorialMutationError(
      "Review the highlighted fields.",
      validation.fieldErrors,
    );
  }
  return prisma.$transaction(async (transaction) => {
    const assignment = await transaction.reviewAssignment.findFirst({
      where: {
        id: input.assignmentId,
        editorId: input.editorId,
        status: { notIn: ["COMPLETED", "CANCELLED", "DECLINED"] },
        editor: {
          isActive: true,
          journalRoles: {
            some: { journalId: input.journalId, role: "EDITOR" },
          },
        },
        reviewRound: {
          status: "ACTIVE",
          submission: {
            journalId: input.journalId,
            status: { in: ["UNDER_REVIEW", "REVIEWS_RECEIVED"] },
          },
        },
      },
      select: {
        id: true,
        reviewRoundId: true,
        reviewRound: { select: { submissionId: true } },
        review: { select: { id: true, version: true } },
      },
    });
    if (!assignment) {
      throw new EditorialMutationError(
        "This assignment is no longer open for review.",
      );
    }
    if (
      assignment.review &&
      assignment.review.version !== input.reviewVersion
    ) {
      throw new EditorialMutationError(
        "This review changed in another window. Refresh before saving.",
      );
    }
    if (!assignment.review && input.reviewVersion !== 0) {
      throw new EditorialMutationError("Refresh before saving this review.");
    }
    const submittedAt = input.final ? new Date() : null;
    const data = {
      status: input.final ? ("SUBMITTED" as const) : ("DRAFT" as const),
      originality: input.review.originality || null,
      methodology: input.review.methodology || null,
      clarity: input.review.clarity || null,
      relevance: input.review.relevance || null,
      recommendation: (input.review.recommendation ||
        null) as ReviewRecommendation | null,
      commentsToAuthor: input.review.commentsToAuthor.trim() || null,
      confidentialComments: input.review.confidentialComments.trim() || null,
      submittedAt,
    };
    if (assignment.review) {
      await transaction.review.update({
        where: { id: assignment.review.id },
        data: { ...data, version: { increment: 1 } },
      });
    } else {
      await transaction.review.create({
        data: { assignmentId: assignment.id, ...data },
      });
    }
    await transaction.reviewAssignment.update({
      where: { id: assignment.id },
      data: input.final
        ? {
            status: "COMPLETED",
            completedAt: submittedAt,
            respondedAt: submittedAt,
          }
        : { status: "IN_REVIEW", respondedAt: new Date() },
    });
    if (input.final) {
      await transaction.submissionEvent.create({
        data: {
          submissionId: assignment.reviewRound.submissionId,
          actorId: input.editorId,
          reviewRoundId: assignment.reviewRoundId,
          type: "REVIEW_SUBMITTED",
        },
      });
      const completedCount = await transaction.reviewAssignment.count({
        where: {
          reviewRoundId: assignment.reviewRoundId,
          review: { status: "SUBMITTED" },
        },
      });
      const activeCount = await transaction.reviewAssignment.count({
        where: {
          reviewRoundId: assignment.reviewRoundId,
          status: { notIn: ["CANCELLED", "DECLINED"] },
        },
      });
      if (
        completedCount >= minimumCompletedReviews &&
        completedCount === activeCount
      ) {
        await transaction.submission.update({
          where: { id: assignment.reviewRound.submissionId },
          data: { status: "REVIEWS_RECEIVED", version: { increment: 1 } },
        });
      }
    }
  });
}

export async function issueEditorialDecision(input: {
  adminId: string;
  journalId: string;
  submissionId: string;
  roundId: string;
  type: EditorialDecisionType;
  reason: string;
  authorMessage: string;
  revisionDueAt?: Date | null;
}) {
  await assertJournalAdmin(input.adminId, input.journalId);
  const authorMessage = input.authorMessage.trim();
  if (!authorMessage) {
    throw new EditorialMutationError("Add a decision message for the author.", {
      authorMessage: "The author message is required.",
    });
  }
  if (isRevisionDecision(input.type) && !input.revisionDueAt) {
    throw new EditorialMutationError("Set a revision due date.", {
      revisionDueAt: "A due date is required for revision decisions.",
    });
  }
  return prisma.$transaction(async (transaction) => {
    const round = await transaction.reviewRound.findFirst({
      where: {
        id: input.roundId,
        submissionId: input.submissionId,
        status: "ACTIVE",
        submission: {
          journalId: input.journalId,
          status: "REVIEWS_RECEIVED",
        },
      },
      select: {
        id: true,
        _count: {
          select: {
            assignments: { where: { review: { status: "SUBMITTED" } } },
          },
        },
      },
    });
    if (!round || round._count.assignments < minimumCompletedReviews) {
      throw new EditorialMutationError(
        "At least two submitted reviews are required before a decision.",
      );
    }
    const decision = await transaction.editorialDecision.create({
      data: {
        submissionId: input.submissionId,
        reviewRoundId: round.id,
        decidedById: input.adminId,
        type: input.type,
        reason: input.reason.trim() || null,
        authorMessage,
        revisionDueAt: isRevisionDecision(input.type)
          ? input.revisionDueAt
          : null,
      },
      select: { id: true },
    });
    await transaction.reviewRound.update({
      where: { id: round.id },
      data: { status: "COMPLETED", closedAt: new Date() },
    });
    await transaction.submission.update({
      where: { id: input.submissionId },
      data: {
        status: decisionSubmissionStatus(input.type),
        version: { increment: 1 },
      },
    });
    await transaction.submissionEvent.create({
      data: {
        submissionId: input.submissionId,
        actorId: input.adminId,
        reviewRoundId: round.id,
        type: "EDITORIAL_DECISION",
        message: authorMessage,
        authorVisible: true,
      },
    });
    return decision;
  });
}

type UploadedFileMetadata = {
  bucket: string;
  objectPath: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256?: string | null;
};

export async function recordRevision(input: {
  ownerId: string;
  submissionId: string;
  authorNote: string;
  manuscript: UploadedFileMetadata;
  response?: UploadedFileMetadata | null;
}) {
  const note = input.authorNote.trim();
  if (!note) {
    throw new EditorialMutationError(
      "Add a short note explaining the changes in this version.",
      { authorNote: "A revision note is required." },
    );
  }
  return prisma.$transaction(
    async (transaction) => {
      const submission = await transaction.submission.findFirst({
        where: {
          id: input.submissionId,
          ownerId: input.ownerId,
          status: { in: ["CORRECTION_REQUESTED", "REVISION_REQUESTED"] },
        },
        select: {
          id: true,
          manuscriptVersions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
            select: { versionNumber: true },
          },
        },
      });
      if (!submission) {
        throw new EditorialMutationError(
          "This submission is not awaiting a revision.",
        );
      }
      const manuscript = await transaction.storedFile.create({
        data: { ...input.manuscript, uploaderId: input.ownerId },
        select: { id: true },
      });
      const response = input.response
        ? await transaction.storedFile.create({
            data: { ...input.response, uploaderId: input.ownerId },
            select: { id: true },
          })
        : null;
      const version = await transaction.submissionVersion.create({
        data: {
          submissionId: submission.id,
          versionNumber:
            (submission.manuscriptVersions[0]?.versionNumber ?? 0) + 1,
          kind: "REVISION",
          manuscriptStoredFileId: manuscript.id,
          responseStoredFileId: response?.id,
          authorNote: note,
        },
        select: { id: true, versionNumber: true },
      });
      await transaction.submission.update({
        where: { id: submission.id },
        data: { status: "REVISED", version: { increment: 1 } },
      });
      await transaction.submissionEvent.create({
        data: {
          submissionId: submission.id,
          actorId: input.ownerId,
          submissionVersionId: version.id,
          type: "REVISION_SUBMITTED",
          message: `Manuscript version ${version.versionNumber}`,
          authorVisible: true,
        },
      });
      return version;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 20_000,
    },
  );
}
