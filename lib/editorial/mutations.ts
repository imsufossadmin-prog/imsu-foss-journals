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
    const submission = await transaction.submission.findFirst({
      where: {
        id: input.submissionId,
        journalId: input.journalId,
        status: "SCREENING",
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
        "This manuscript is no longer in initial assessment.",
      );
    }

    await transaction.submission.update({
      where: { id: submission.id },
      data: { status: "CORRECTION_REQUESTED", version: { increment: 1 } },
    });

    await transaction.submissionEvent.create({
      data: {
        submissionId: submission.id,
        actorId: input.adminId,
        type: "CORRECTION_REQUESTED",
        message,
        authorVisible: true,
      },
    });

    if (submission.request) {
      const manuscriptFileId =
        submission.files[0]?.storedFileId ??
        submission.manuscriptVersions[0]?.manuscriptStoredFileId;

      await transaction.submissionRequest.update({
        where: { id: submission.request.id },
        data: { version: { increment: 1 } },
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

      if (manuscriptFileId) {
        await transaction.conversationAttachment.create({
          data: {
            messageId: conversationMessage.id,
            storedFileId: manuscriptFileId,
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
              in: ["AWAITING_REVIEWERS", "UNDER_REVIEW", "REVIEWS_RECEIVED"],
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
      if (completedCount >= 1) {
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

  return prisma.$transaction(async (tx) => {
    await tx.submission.update({
      where: { id: submission.id },
      data: { status: "ACCEPTED", version: { increment: 1 } },
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
    const article = await tx.article.upsert({
      where: { slug: articleSlug },
      update: {
        title: submission.title || "Untitled Article",
        abstract: submission.abstract,
        keywords: submission.keywords,
        doi: input.doi?.trim() || null,
        coverImageUrl: input.coverImageUrl || null,
        pageStart: input.pageRange?.split("-")[0]?.trim() || null,
        pageEnd: input.pageRange?.split("-")[1]?.trim() || null,
        isPublished: true,
        publishedAt: new Date(),
      },
      create: {
        issueId: issue.id,
        title: submission.title || "Untitled Article",
        slug: articleSlug,
        abstract: submission.abstract,
        keywords: submission.keywords,
        doi: input.doi?.trim() || null,
        coverImageUrl: input.coverImageUrl || null,
        pageStart: input.pageRange?.split("-")[0]?.trim() || null,
        pageEnd: input.pageRange?.split("-")[1]?.trim() || null,
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    await Promise.all(
      submission.authors.map((author) =>
        tx.articleAuthor.upsert({
          where: {
            articleId_position: {
              articleId: article.id,
              position: author.position,
            },
          },
          update: {
            fullName: author.fullName,
            email: author.email,
          },
          create: {
            articleId: article.id,
            fullName: author.fullName,
            email: author.email,
            position: author.position,
          },
        }),
      ),
    );

    const meta = [
      input.volume ? `Volume ${input.volume}` : null,
      input.issue ? `Issue ${input.issue}` : null,
      input.pageRange ? `Pages ${input.pageRange}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    await tx.submissionEvent.create({
      data: {
        submissionId: submission.id,
        actorId: input.adminId,
        type: "EDITORIAL_DECISION",
        message: meta
          ? `Article published live to journal archives (${meta})`
          : "Article published live to official journal archives.",
        authorVisible: true,
      },
    });

    return article;
  });
}
