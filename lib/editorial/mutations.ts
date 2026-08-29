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
  validateAdherenceReport,
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
  const [, submission] = await Promise.all([
    assertJournalAdmin(input.adminId, input.journalId),
    prisma.submission.findFirst({
      where: {
        id: input.submissionId,
        journalId: input.journalId,
        trackingNumber: { not: null },
        status: { in: ["SUBMITTED", "REVISED"] },
      },
      select: { id: true },
    }),
  ]);
  if (!submission) {
    throw new EditorialMutationError(
      "Assign a tracking ID before starting editorial assessment.",
    );
  }
  try {
    await prisma.submission.update({
      where: {
        id: submission.id,
        journalId: input.journalId,
        status: { in: ["SUBMITTED", "REVISED"] },
      },
      data: {
        status: "SCREENING",
        version: { increment: 1 },
        events: {
          create: {
            actorId: input.adminId,
            type: "INITIAL_ASSESSMENT_STARTED",
            authorVisible: true,
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new EditorialMutationError(
        "Assign a tracking ID before starting editorial assessment.",
      );
    }
    throw error;
  }
}

export async function returnForCorrection(input: {
  adminId: string;
  journalId: string;
  submissionId: string;
  message: string;
  attachments?: Array<{
    bucket: string;
    objectPath: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
}) {
  await assertJournalAdmin(input.adminId, input.journalId);
  const message = input.message.trim();
  if (!message) {
    throw new EditorialMutationError("Explain what the author must correct.", {
      message: "Correction guidance is required.",
    });
  }
  await prisma.$transaction(async (transaction) => {
    const submission = await transaction.submission.findFirst({
      where: {
        id: input.submissionId,
        journalId: input.journalId,
        status: {
          in: [
            "SCREENING",
            "AWAITING_REVIEWERS",
            "UNDER_REVIEW",
            "REVIEWS_RECEIVED",
            "CORRECTION_REQUESTED",
          ],
        },
      },
      select: {
        id: true,
        request: { select: { id: true } },
        files: {
          where: { type: "MANUSCRIPT" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { storedFileId: true },
        },
        manuscriptVersions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: { manuscriptStoredFileId: true },
        },
      },
    });

    if (!submission) {
      throw new EditorialMutationError(
        "This manuscript is not available for correction request.",
      );
    }

    await transaction.submission.update({
      where: { id: submission.id },
      data: { status: "CORRECTION_REQUESTED", version: { increment: 1 } },
    });

    // Create stored files for any attachments provided by admin
    const storedAttachments: string[] = [];
    if (input.attachments && input.attachments.length > 0) {
      for (const att of input.attachments) {
        const stored = await transaction.storedFile.create({
          data: { ...att, uploaderId: input.adminId },
          select: { id: true, originalFileName: true },
        });
        storedAttachments.push(stored.id);
      }
    }

    const totalAttCount = storedAttachments.length;
    const attLabel =
      totalAttCount > 0
        ? totalAttCount === 1
          ? "1 attachment"
          : `${totalAttCount} attachments`
        : null;

    await transaction.submissionEvent.create({
      data: {
        submissionId: submission.id,
        actorId: input.adminId,
        type: "CORRECTION_REQUESTED",
        message: attLabel,
        authorVisible: true,
      },
    });

    if (submission.request) {
      const manuscriptFileId =
        submission.files[0]?.storedFileId ??
        submission.manuscriptVersions[0]?.manuscriptStoredFileId;

      await transaction.submissionRequest.update({
        where: { id: submission.request.id },
        data: { version: { increment: 1 }, updatedAt: new Date() },
      });

      const conversationMessage =
        await transaction.submissionConversationMessage.create({
          data: {
            requestId: submission.request.id,
            senderId: input.adminId,
            kind: "USER",
            body: `📋 Correction Requested:\n\n${message}`,
          },
        });

      if (
        manuscriptFileId &&
        (!input.attachments || input.attachments.length === 0)
      ) {
        await transaction.conversationAttachment.create({
          data: {
            messageId: conversationMessage.id,
            storedFileId: manuscriptFileId,
            type: "GENERAL",
          },
        });
      }

      for (const storedId of storedAttachments) {
        await transaction.conversationAttachment.create({
          data: {
            messageId: conversationMessage.id,
            storedFileId: storedId,
            type: "GENERAL",
          },
        });
      }
    }
  });
}

export async function markRevisionReceived(input: {
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
        status: { in: ["CORRECTION_REQUESTED", "REVISION_REQUESTED"] },
      },
      select: {
        id: true,
        status: true,
        request: { select: { id: true } },
      },
    });
    if (!submission) {
      throw new EditorialMutationError(
        "This manuscript is not waiting for a revision.",
      );
    }
    await transaction.submission.update({
      where: { id: submission.id },
      data: { status: "REVISED", version: { increment: 1 } },
    });
    await transaction.submissionEvent.create({
      data: {
        submissionId: submission.id,
        actorId: input.adminId,
        type: "REVISION_SUBMITTED",
        authorVisible: true,
        message: "Revision marked as received by journal admin.",
      },
    });
    if (submission.request) {
      await transaction.submissionRequest.update({
        where: { id: submission.request.id },
        data: { version: { increment: 1 } },
      });
      await transaction.submissionConversationMessage.create({
        data: {
          requestId: submission.request.id,
          kind: "SYSTEM",
          body: "Revision received by journal admin. Continuing initial assessment.",
        },
      });
    }
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
    const submittedCount = await transaction.reviewAssignment.count({
      where: {
        reviewRoundId: assignment.reviewRoundId,
        review: { status: "SUBMITTED" },
      },
    });
    if (submittedCount >= 1) {
      await transaction.submission.update({
        where: { id: input.submissionId },
        data: { status: "REVIEWS_RECEIVED", version: { increment: 1 } },
      });
    } else {
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
  attachments?: Array<{
    bucket: string;
    objectPath: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
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
          status: { in: ["PLANNED", "ACTIVE"] },
          submission: {
            journalId: input.journalId,
            status: {
              in: [
                "AWAITING_REVIEWERS",
                "UNDER_REVIEW",
                "REVIEWS_RECEIVED",
                "REVISED",
              ],
            },
          },
        },
      },
      select: {
        id: true,
        reviewRoundId: true,
        reviewRound: {
          select: {
            id: true,
            status: true,
            submissionId: true,
            submission: { select: { id: true, status: true } },
          },
        },
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
    if (
      assignment.reviewRound.status === "PLANNED" ||
      assignment.reviewRound.submission.status === "AWAITING_REVIEWERS"
    ) {
      await transaction.reviewRound.update({
        where: { id: assignment.reviewRound.id },
        data: {
          status: "ACTIVE",
          ...(assignment.reviewRound.status === "PLANNED"
            ? { openedAt: new Date() }
            : {}),
        },
      });
      await transaction.submission.update({
        where: { id: assignment.reviewRound.submissionId },
        data: { status: "UNDER_REVIEW", version: { increment: 1 } },
      });
    }
    const submittedAt = input.final ? new Date() : null;
    const reportText = (
      input.review.generalReport ||
      input.review.commentsToAuthor ||
      ""
    ).trim();

    const data = {
      status: input.final ? ("SUBMITTED" as const) : ("DRAFT" as const),
      titleAbstract: input.review.titleAbstract || null,
      introductionThesis: input.review.introductionThesis || null,
      literatureReview: input.review.literatureReview || null,
      methodology: input.review.methodology || null,
      resultsDiscussion: input.review.resultsDiscussion || null,
      conclusion: input.review.conclusion || null,
      languageStyle: input.review.languageStyle || null,
      apaAdherence: input.review.apaAdherence || null,
      generalReport: reportText || null,
      commentsToAuthor: reportText || null,
      confidentialComments: input.review.confidentialComments?.trim() || null,
      recommendation: (input.review.recommendation ||
        null) as ReviewRecommendation | null,
      submittedAt,
    };

    let reviewId: string;
    if (assignment.review) {
      reviewId = assignment.review.id;
      await transaction.review.update({
        where: { id: reviewId },
        data: { ...data, version: { increment: 1 } },
      });
    } else {
      const created = await transaction.review.create({
        data: { assignmentId: assignment.id, ...data },
        select: { id: true },
      });
      reviewId = created.id;
    }

    if (input.attachments && input.attachments.length > 0) {
      for (const att of input.attachments) {
        const stored = await transaction.storedFile.create({
          data: {
            bucket: att.bucket,
            objectPath: att.objectPath,
            originalFileName: att.originalFileName,
            mimeType: att.mimeType,
            sizeBytes: BigInt(att.sizeBytes),
            uploaderId: input.editorId,
          },
          select: { id: true },
        });
        await transaction.reviewAttachment.create({
          data: {
            reviewId,
            storedFileId: stored.id,
          },
        });
      }
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
      const attCount = input.attachments?.length ?? 0;
      const attLabel =
        attCount > 0
          ? attCount === 1
            ? "1 attachment"
            : `${attCount} attachments`
          : null;

      await transaction.submissionEvent.create({
        data: {
          submissionId: assignment.reviewRound.submissionId,
          actorId: input.editorId,
          reviewRoundId: assignment.reviewRoundId,
          type: "REVIEW_SUBMITTED",
          message: attLabel,
        },
      });
      const completedCount = await transaction.reviewAssignment.count({
        where: {
          reviewRoundId: assignment.reviewRoundId,
          review: { status: "SUBMITTED" },
        },
      });
      if (completedCount >= 1) {
        await transaction.submission.update({
          where: { id: assignment.reviewRound.submissionId },
          data: { status: "REVIEWS_RECEIVED", version: { increment: 1 } },
        });
      }
    }
  });
}

export async function submitAdherenceReport(input: {
  editorId: string;
  journalId: string;
  submissionId: string;
  outcome: "ADHERED" | "PARTIALLY_ADHERED" | "DID_NOT_ADHERE";
  report: string;
}) {
  const actor = await prisma.user.findUnique({
    where: { id: input.editorId },
    select: {
      id: true,
      isActive: true,
      globalRoles: { select: { role: true } },
      journalRoles: { select: { journalId: true, role: true } },
    },
  });
  if (!actor || !actor.isActive) {
    throw new EditorialMutationError("Unauthorized user.");
  }

  const isSuperAdmin = actor.globalRoles.some((r) => r.role === "SUPER_ADMIN");
  const isJournalAdmin = actor.journalRoles.some(
    (r) => r.journalId === input.journalId && r.role === "JOURNAL_ADMIN",
  );
  const isJournalEditor = actor.journalRoles.some(
    (r) => r.journalId === input.journalId && r.role === "EDITOR",
  );

  const submission = await prisma.submission.findFirst({
    where: { id: input.submissionId, journalId: input.journalId },
    select: {
      id: true,
      journalId: true,
      manuscriptVersions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: { id: true, versionNumber: true },
      },
      reviewRounds: {
        select: {
          assignments: {
            where: { editorId: input.editorId },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!submission) {
    throw new EditorialMutationError("Manuscript not found.");
  }

  const hasAssignment = submission.reviewRounds.some(
    (r) => r.assignments.length > 0,
  );

  const canSubmit =
    isSuperAdmin || isJournalAdmin || (isJournalEditor && hasAssignment);

  if (!canSubmit) {
    throw new EditorialMutationError(
      "Only assigned editors or journal administrators can submit an adherence report for this manuscript.",
    );
  }

  const validation = validateAdherenceReport({
    outcome: input.outcome,
    report: input.report,
  });
  if (!validation.valid) {
    throw new EditorialMutationError(
      "Review the highlighted fields.",
      validation.fieldErrors,
    );
  }

  const latestVersion = submission.manuscriptVersions[0];

  return prisma.$transaction(async (tx) => {
    const adherence = await tx.adherenceReport.create({
      data: {
        submissionId: submission.id,
        submissionVersionId: latestVersion?.id ?? null,
        editorId: input.editorId,
        outcome: input.outcome,
        report: input.report.trim(),
      },
    });

    const outcomeLabel =
      input.outcome === "ADHERED"
        ? "Adhered"
        : input.outcome === "PARTIALLY_ADHERED"
          ? "Partially Adhered"
          : "Did Not Adhere";

    await tx.submissionEvent.create({
      data: {
        submissionId: submission.id,
        actorId: input.editorId,
        submissionVersionId: latestVersion?.id ?? null,
        type: "ADHERENCE_REPORT_SUBMITTED",
        message: outcomeLabel,
        authorVisible: false,
      },
    });

    return adherence;
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
          status: {
            in: ["AWAITING_REVIEWERS", "UNDER_REVIEW", "REVIEWS_RECEIVED"],
          },
        },
      },
      select: {
        id: true,
        submission: { select: { request: { select: { id: true } } } },
      },
    });
    if (!round) {
      throw new EditorialMutationError(
        "Active review round not found for this manuscript.",
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
    if (round.submission.request) {
      await transaction.submissionRequest.update({
        where: { id: round.submission.request.id },
        data: { version: { increment: 1 } },
      });
      await transaction.submissionConversationMessage.create({
        data: {
          requestId: round.submission.request.id,
          senderId: input.adminId,
          kind: "USER",
          body: `📋 Editorial Decision: ${input.type.replaceAll("_", " ")}\n\n${authorMessage}`,
        },
      });
    }
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
  additionalAttachments?: UploadedFileMetadata[];
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
          request: { select: { id: true } },
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

      const additionalStored: Array<{ id: string }> = [];
      if (
        input.additionalAttachments &&
        input.additionalAttachments.length > 0
      ) {
        for (const att of input.additionalAttachments) {
          const stored = await transaction.storedFile.create({
            data: { ...att, uploaderId: input.ownerId },
            select: { id: true },
          });
          additionalStored.push(stored);
        }
      }

      const nextVersionNumber =
        (submission.manuscriptVersions[0]?.versionNumber ?? 0) + 1;
      const version = await transaction.submissionVersion.create({
        data: {
          submissionId: submission.id,
          versionNumber: nextVersionNumber,
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
      const correctionNumber = Math.max(1, version.versionNumber - 1);
      const totalAttCount = 1 + (response ? 1 : 0) + additionalStored.length;
      const attLabel =
        totalAttCount === 1 ? "1 attachment" : `${totalAttCount} attachments`;

      await transaction.submissionEvent.create({
        data: {
          submissionId: submission.id,
          actorId: input.ownerId,
          submissionVersionId: version.id,
          type: "REVISION_SUBMITTED",
          message: attLabel,
          authorVisible: true,
        },
      });
      if (submission.request) {
        await transaction.submissionRequest.update({
          where: { id: submission.request.id },
          data: { version: { increment: 1 }, updatedAt: new Date() },
        });
        const msg = await transaction.submissionConversationMessage.create({
          data: {
            requestId: submission.request.id,
            senderId: input.ownerId,
            kind: "USER",
            body: `📋 Correction #${correctionNumber} submitted.\n\nAuthor note: ${note}`,
          },
        });
        await transaction.conversationAttachment.create({
          data: {
            messageId: msg.id,
            storedFileId: manuscript.id,
            type: "GENERAL",
          },
        });
        if (response) {
          await transaction.conversationAttachment.create({
            data: {
              messageId: msg.id,
              storedFileId: response.id,
              type: "GENERAL",
            },
          });
        }
        for (const extra of additionalStored) {
          await transaction.conversationAttachment.create({
            data: {
              messageId: msg.id,
              storedFileId: extra.id,
              type: "GENERAL",
            },
          });
        }
      }
      return version;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 20_000,
    },
  );
}

export async function skipToPublishing(input: {
  adminId: string;
  journalId: string;
  submissionId: string;
}) {
  await assertJournalAdmin(input.adminId, input.journalId);

  const submission = await prisma.submission.findFirst({
    where: {
      id: input.submissionId,
      journalId: input.journalId,
    },
    select: { id: true, status: true },
  });

  if (!submission) {
    throw new EditorialMutationError("Submission not found.");
  }

  await prisma.submission.update({
    where: { id: submission.id },
    data: { status: "ACCEPTED", version: { increment: 1 } },
  });

  await prisma.submissionEvent.create({
    data: {
      submissionId: submission.id,
      actorId: input.adminId,
      type: "EDITORIAL_DECISION",
      message:
        "Manuscript approved for Publishing & Production (editorial decision skipped).",
      authorVisible: true,
    },
  });
}

export async function publishArticle(input: {
  adminId: string;
  journalId: string;
  submissionId: string;
  volume?: string;
  issue?: string;
  pageRange?: string;
  coverImageUrl?: string;
  doi?: string;
  issueOrder?: number;
  productionFile?: {
    bucket: string;
    objectPath: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
  };
  coverFile?: {
    bucket: string;
    objectPath: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
  };
}) {
  await assertJournalAdmin(input.adminId, input.journalId);

  const submission = await prisma.submission.findFirst({
    where: {
      id: input.submissionId,
      journalId: input.journalId,
    },
    select: {
      id: true,
      title: true,
      abstract: true,
      keywords: true,
      journalId: true,
      authors: {
        select: { fullName: true, email: true, position: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!submission) {
    throw new EditorialMutationError("Manuscript not found for publication.");
  }

  const publicationMeta = [
    input.volume ? `Volume ${input.volume}` : null,
    input.issue ? `Issue ${input.issue}` : null,
    input.pageRange ? `Pages ${input.pageRange}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return prisma.$transaction(async (tx) => {
    await tx.submission.update({
      where: { id: submission.id },
      data: {
        status: "ACCEPTED",
        version: { increment: 1 },
        events: {
          create: {
            actorId: input.adminId,
            type: "EDITORIAL_DECISION",
            message: publicationMeta
              ? `Article published live to journal archives (${publicationMeta})`
              : "Article published live to official journal archives.",
            authorVisible: true,
          },
        },
      },
    });

    const volNum = parseInt(input.volume || "1", 10) || 1;
    const issueNum = parseInt(input.issue || "1", 10) || 1;

    const volume = await tx.volume.upsert({
      where: {
        journalId_year_number: {
          journalId: submission.journalId,
          year: new Date().getFullYear(),
          number: volNum,
        },
      },
      update: {},
      create: {
        journalId: submission.journalId,
        number: volNum,
        year: new Date().getFullYear(),
        title: `Volume ${volNum}`,
      },
    });

    const issue = await tx.issue.upsert({
      where: { volumeId_number: { volumeId: volume.id, number: issueNum } },
      update: { isPublished: true, publishedAt: new Date() },
      create: {
        volumeId: volume.id,
        number: issueNum,
        title: `Issue ${issueNum}`,
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    const articleSlug = `art-${submission.id.toLowerCase()}`;
    const pageRangeParts = input.pageRange ? input.pageRange.split("-") : [];
    const pageStart = pageRangeParts[0]?.trim() || null;
    const pageEnd = pageRangeParts[1]?.trim() || null;

    // 1. Check if this article already exists
    const existingArticle = await tx.article.findUnique({
      where: { slug: articleSlug },
      select: { id: true, issueId: true, issueOrder: true },
    });

    // 2. Fetch other articles in the target issue
    const otherArticlesInIssue = await tx.article.findMany({
      where: {
        issueId: issue.id,
        NOT: existingArticle ? { id: existingArticle.id } : undefined,
      },
      select: { issueOrder: true },
    });

    const occupiedOrders = new Set(
      otherArticlesInIssue
        .map((a) => a.issueOrder)
        .filter((o): o is number => o !== null && o !== undefined),
    );

    let finalOrder: number;

    if (
      input.issueOrder !== undefined &&
      input.issueOrder !== null &&
      !isNaN(input.issueOrder)
    ) {
      // Explicit order requested by admin
      if (occupiedOrders.has(input.issueOrder)) {
        throw new EditorialMutationError(
          `Article order ${input.issueOrder} is already used in this issue. Choose another order.`,
        );
      }
      finalOrder = input.issueOrder;
    } else if (
      existingArticle &&
      existingArticle.issueId === issue.id &&
      existingArticle.issueOrder !== null &&
      existingArticle.issueOrder !== undefined &&
      !occupiedOrders.has(existingArticle.issueOrder)
    ) {
      // Preserved existing order upon republishing to the same issue
      finalOrder = existingArticle.issueOrder;
    } else {
      // Automatic next available order: max existing order in issue + 1
      const maxOrder = otherArticlesInIssue.reduce(
        (max, a) => (a.issueOrder && a.issueOrder > max ? a.issueOrder : max),
        0,
      );
      let candidate = maxOrder + 1;
      while (occupiedOrders.has(candidate)) {
        candidate++;
      }
      finalOrder = candidate;
    }

    const article = await tx.article.upsert({
      where: { slug: articleSlug },
      update: {
        title: submission.title || "Untitled Article",
        abstract: submission.abstract,
        keywords: submission.keywords,
        doi: input.doi?.trim() || null,
        coverImageUrl: input.coverImageUrl || null,
        pageStart,
        pageEnd,
        issueOrder: finalOrder,
        isPublished: true,
        publishedAt: new Date(),
        authors: {
          deleteMany: {},
          create: submission.authors.map((author) => ({
            fullName: author.fullName,
            email: author.email,
            position: author.position,
          })),
        },
      },
      create: {
        issueId: issue.id,
        title: submission.title || "Untitled Article",
        slug: articleSlug,
        abstract: submission.abstract,
        keywords: submission.keywords,
        doi: input.doi?.trim() || null,
        coverImageUrl: input.coverImageUrl || null,
        pageStart,
        pageEnd,
        issueOrder: finalOrder,
        isPublished: true,
        publishedAt: new Date(),
        authors: {
          create: submission.authors.map((author) => ({
            fullName: author.fullName,
            email: author.email,
            position: author.position,
          })),
        },
      },
    });

    if (input.productionFile) {
      const stored = await tx.storedFile.create({
        data: {
          bucket: input.productionFile.bucket,
          objectPath: input.productionFile.objectPath,
          originalFileName: input.productionFile.originalFileName,
          mimeType: input.productionFile.mimeType,
          sizeBytes: BigInt(input.productionFile.sizeBytes),
          uploaderId: input.adminId,
        },
      });

      const fileType =
        input.productionFile.mimeType === "application/pdf"
          ? ("PUBLISHED_PDF" as const)
          : ("PRODUCTION_FILE" as const);

      await tx.articleFile.deleteMany({
        where: {
          articleId: article.id,
          type: { in: ["PUBLISHED_PDF", "PRODUCTION_FILE"] },
        },
      });

      await tx.articleFile.create({
        data: {
          articleId: article.id,
          storedFileId: stored.id,
          type: fileType,
        },
      });
    }

    if (input.coverFile) {
      const storedCover = await tx.storedFile.create({
        data: {
          bucket: input.coverFile.bucket,
          objectPath: input.coverFile.objectPath,
          originalFileName: input.coverFile.originalFileName,
          mimeType: input.coverFile.mimeType,
          sizeBytes: BigInt(input.coverFile.sizeBytes),
          uploaderId: input.adminId,
        },
      });

      await tx.articleFile.deleteMany({
        where: {
          articleId: article.id,
          type: "COVER_IMAGE",
        },
      });

      await tx.articleFile.create({
        data: {
          articleId: article.id,
          storedFileId: storedCover.id,
          type: "COVER_IMAGE",
        },
      });
    }

    return article;
  });
}
