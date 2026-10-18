import "server-only";

import type { PrismaClient } from "@prisma/client";
import { generateIdempotencyKey, createNotification } from "./service";
import {
  resolveJournalAdminRecipients,
  resolveManuscriptRecipients,
  resolveSuperAdminRecipients,
} from "./recipient-resolution";

/**
 * Helper to get the Prisma client (supports injection for testing).
 */
async function getDb(db?: unknown): Promise<PrismaClient> {
  if (db && typeof db === "object") {
    return db as unknown as PrismaClient;
  }
  const { prisma } = await import("@/lib/db/prisma");
  return prisma;
}

/**
 * 1. Event: New Manuscript Submitted
 * Target: Super Admins + Journal Admins of the target journal.
 */
export async function handleManuscriptSubmitted(
  submissionId: string,
  db?: unknown,
): Promise<void> {
  try {
    const client = await getDb(db);
    const submission = await client.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        title: true,
        journalId: true,
        journal: { select: { slug: true, name: true, shortName: true } },
      },
    });

    if (!submission) return;

    const [superAdmins, journalAdmins] = await Promise.all([
      resolveSuperAdminRecipients(client),
      submission.journalId
        ? resolveJournalAdminRecipients(submission.journalId, client)
        : Promise.resolve([]),
    ]);

    const recipientIds = Array.from(
      new Set([...superAdmins, ...journalAdmins]),
    );
    const journalSlug = submission.journal?.slug || "general";
    const journalLabel =
      submission.journal?.shortName || submission.journal?.name || "Journal";
    const titleText = submission.title
      ? `"${submission.title}"`
      : "New Manuscript";

    for (const userId of recipientIds) {
      await createNotification(
        {
          userId,
          journalId: submission.journalId,
          type: "MANUSCRIPT_SUBMITTED",
          title: "New Manuscript Submitted",
          message: `${titleText} has been submitted to ${journalLabel} and requires editorial intake.`,
          actionUrl: `/admin/${journalSlug}/submissions/${submission.id}`,
          resourceType: "Submission",
          resourceId: submission.id,
          idempotencyKey: generateIdempotencyKey({
            userId,
            type: "MANUSCRIPT_SUBMITTED",
            resourceId: submission.id,
          }),
        },
        client,
      );
    }
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch MANUSCRIPT_SUBMITTED for submission ${submissionId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * 2. Event: New Submission Request Started
 * Target: Super Admins + Journal Admins of the request's journal.
 */
export async function handleSubmissionRequestCreated(
  requestId: string,
  db?: unknown,
): Promise<void> {
  try {
    const client = await getDb(db);
    const request = await client.submissionRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        authorId: true,
        journalId: true,
        journal: { select: { slug: true, name: true, shortName: true } },
        author: { select: { displayName: true } },
      },
    });

    if (!request) return;

    const [superAdmins, journalAdmins] = await Promise.all([
      resolveSuperAdminRecipients(client),
      request.journalId
        ? resolveJournalAdminRecipients(request.journalId, client)
        : Promise.resolve([]),
    ]);

    const recipientIds = Array.from(
      new Set([...superAdmins, ...journalAdmins]),
    );
    const journalSlug = request.journal?.slug || "general";
    const authorName = request.author?.displayName || "An author";

    for (const userId of recipientIds) {
      // Do not notify if the admin started the request themselves
      if (userId === request.authorId) continue;

      await createNotification(
        {
          userId,
          journalId: request.journalId,
          type: "REQUEST_MESSAGE",
          title: "New Submission Request Started",
          message: `${authorName} initiated a submission request in ${request.journal?.shortName || "the journal"}.`,
          actionUrl: `/admin/${journalSlug}/requests/${request.id}`,
          resourceType: "SubmissionRequest",
          resourceId: request.id,
          idempotencyKey: generateIdempotencyKey({
            userId,
            type: "REQUEST_MESSAGE",
            resourceId: request.id,
            eventQualifier: "request-started",
          }),
        },
        client,
      );
    }
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch submission request start for ${requestId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * 3. Event: Tracking ID Assigned
 * Target: Manuscript submitting Author.
 */
export async function handleTrackingAssigned(
  input: {
    submissionId: string;
    trackingNumber: string;
  },
  db?: unknown,
): Promise<void> {
  try {
    const client = await getDb(db);
    const submission = await client.submission.findUnique({
      where: { id: input.submissionId },
      select: {
        id: true,
        ownerId: true,
        title: true,
        journalId: true,
      },
    });

    if (!submission || !submission.ownerId) return;

    const titleText = submission.title
      ? `"${submission.title}"`
      : "Your manuscript";

    await createNotification(
      {
        userId: submission.ownerId,
        journalId: submission.journalId,
        type: "TRACKING_ASSIGNED",
        title: "Tracking Number Assigned",
        message: `Permanent tracking code ${input.trackingNumber} has been assigned to ${titleText}.`,
        actionUrl: `/author/submissions/${submission.id}`,
        resourceType: "Submission",
        resourceId: submission.id,
        idempotencyKey: generateIdempotencyKey({
          userId: submission.ownerId,
          type: "TRACKING_ASSIGNED",
          resourceId: submission.id,
        }),
      },
      client,
    );
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch TRACKING_ASSIGNED for submission ${input.submissionId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * 4. Event: Manuscript Returned for Correction
 * Target: Manuscript submitting Author.
 */
export async function handleCorrectionRequested(
  input: {
    submissionId: string;
    note?: string;
    versionNumber?: number;
  },
  db?: unknown,
): Promise<void> {
  try {
    const client = await getDb(db);
    const submission = await client.submission.findUnique({
      where: { id: input.submissionId },
      select: {
        id: true,
        ownerId: true,
        title: true,
        journalId: true,
        version: true,
      },
    });

    if (!submission || !submission.ownerId) return;

    const titleText = submission.title
      ? `"${submission.title}"`
      : "your manuscript";
    const reasonText = input.note?.trim()
      ? ` Reason: ${input.note.trim()}`
      : "";

    const versionQualifier =
      typeof input.versionNumber === "number"
        ? `v${input.versionNumber}`
        : typeof submission.version === "number"
          ? `v${submission.version}`
          : "v1";

    await createNotification(
      {
        userId: submission.ownerId,
        journalId: submission.journalId,
        type: "CORRECTION_REQUESTED",
        title: "Manuscript Returned for Correction",
        message: `Editorial screening for ${titleText} requires corrections before proceeding with peer review.${reasonText}`,
        actionUrl: `/author/submissions/${submission.id}`,
        resourceType: "Submission",
        resourceId: submission.id,
        idempotencyKey: generateIdempotencyKey({
          userId: submission.ownerId,
          type: "CORRECTION_REQUESTED",
          resourceId: submission.id,
          eventQualifier: versionQualifier,
        }),
      },
      client,
    );
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch CORRECTION_REQUESTED for submission ${input.submissionId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * 5. Event: Editor / Reviewer Assigned
 * Target: The assigned Editor.
 */
export async function handleReviewerAssigned(
  input: {
    submissionId: string;
    editorId: string;
    roundNumber?: number;
  },
  db?: unknown,
): Promise<void> {
  try {
    const client = await getDb(db);
    const submission = await client.submission.findUnique({
      where: { id: input.submissionId },
      select: {
        id: true,
        title: true,
        journalId: true,
        journal: { select: { slug: true } },
      },
    });

    if (!submission) return;

    const titleText = submission.title
      ? `"${submission.title}"`
      : "a manuscript";
    const journalSlug = submission.journal?.slug || "general";
    const roundNumber = input.roundNumber || 1;

    await createNotification(
      {
        userId: input.editorId,
        journalId: submission.journalId,
        type: "REVIEWER_ASSIGNED",
        title: "New Review Assignment",
        message: `You have been assigned to evaluate ${titleText} (Round ${roundNumber}).`,
        actionUrl: `/editor/${journalSlug}`,
        resourceType: "Submission",
        resourceId: submission.id,
        idempotencyKey: generateIdempotencyKey({
          userId: input.editorId,
          type: "REVIEWER_ASSIGNED",
          resourceId: submission.id,
          eventQualifier: `round-${roundNumber}`,
        }),
      },
      client,
    );
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch REVIEWER_ASSIGNED for submission ${input.submissionId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * 6. Event: Peer Review Submitted
 * Target: Super Admins + Journal Admins of the submission's journal.
 */
export async function handleReviewSubmitted(
  input: {
    submissionId: string;
    reviewerName?: string;
    recommendation: string;
    roundNumber?: number;
  },
  db?: unknown,
): Promise<void> {
  try {
    const client = await getDb(db);
    const submission = await client.submission.findUnique({
      where: { id: input.submissionId },
      select: {
        id: true,
        title: true,
        journalId: true,
        journal: { select: { slug: true } },
      },
    });

    if (!submission) return;

    const [superAdmins, journalAdmins] = await Promise.all([
      resolveSuperAdminRecipients(client),
      submission.journalId
        ? resolveJournalAdminRecipients(submission.journalId, client)
        : Promise.resolve([]),
    ]);

    const recipientIds = Array.from(
      new Set([...superAdmins, ...journalAdmins]),
    );
    const journalSlug = submission.journal?.slug || "general";
    const roundNumber = input.roundNumber || 1;
    const reviewerLabel = input.reviewerName || "An assigned editor";
    const titleText = submission.title
      ? `"${submission.title}"`
      : "the manuscript";

    for (const userId of recipientIds) {
      await createNotification(
        {
          userId,
          journalId: submission.journalId,
          type: "REVIEW_SUBMITTED",
          title: "Peer Review Completed",
          message: `${reviewerLabel} submitted a review for ${titleText} (Recommendation: ${input.recommendation}).`,
          actionUrl: `/admin/${journalSlug}/submissions/${submission.id}`,
          resourceType: "Submission",
          resourceId: submission.id,
          idempotencyKey: generateIdempotencyKey({
            userId,
            type: "REVIEW_SUBMITTED",
            resourceId: submission.id,
            eventQualifier: `round-${roundNumber}:${reviewerLabel}`,
          }),
        },
        client,
      );
    }
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch REVIEW_SUBMITTED for submission ${input.submissionId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * 7. Event: Adherence Report Submitted
 * Target: Super Admins + Journal Admins of the submission's journal.
 */
export async function handleAdherenceReportSubmitted(
  input: {
    submissionId: string;
    editorName?: string;
  },
  db?: unknown,
): Promise<void> {
  try {
    const client = await getDb(db);
    const submission = await client.submission.findUnique({
      where: { id: input.submissionId },
      select: {
        id: true,
        title: true,
        journalId: true,
        journal: { select: { slug: true } },
      },
    });

    if (!submission) return;

    const [superAdmins, journalAdmins] = await Promise.all([
      resolveSuperAdminRecipients(client),
      submission.journalId
        ? resolveJournalAdminRecipients(submission.journalId, client)
        : Promise.resolve([]),
    ]);

    const recipientIds = Array.from(
      new Set([...superAdmins, ...journalAdmins]),
    );
    const journalSlug = submission.journal?.slug || "general";
    const editorLabel = input.editorName || "Editorial staff";
    const titleText = submission.title
      ? `"${submission.title}"`
      : "the manuscript";

    for (const userId of recipientIds) {
      await createNotification(
        {
          userId,
          journalId: submission.journalId,
          type: "ADHERENCE_REPORT_SUBMITTED",
          title: "Editorial Adherence Report Submitted",
          message: `${editorLabel} completed an adherence report for ${titleText}.`,
          actionUrl: `/admin/${journalSlug}/submissions/${submission.id}`,
          resourceType: "Submission",
          resourceId: submission.id,
          idempotencyKey: generateIdempotencyKey({
            userId,
            type: "ADHERENCE_REPORT_SUBMITTED",
            resourceId: submission.id,
          }),
        },
        client,
      );
    }
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch ADHERENCE_REPORT_SUBMITTED for submission ${input.submissionId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * 8. Event: Editorial Decision Issued
 * Target: Manuscript submitting Author.
 */
export async function handleEditorialDecisionIssued(
  input: {
    submissionId: string;
    decision: string;
    roundNumber?: number;
  },
  db?: unknown,
): Promise<void> {
  try {
    const client = await getDb(db);
    const submission = await client.submission.findUnique({
      where: { id: input.submissionId },
      select: {
        id: true,
        ownerId: true,
        title: true,
        journalId: true,
      },
    });

    if (!submission || !submission.ownerId) return;

    const titleText = submission.title
      ? `"${submission.title}"`
      : "your manuscript";
    const roundNumber = input.roundNumber || 1;

    let decisionLabel = input.decision;
    if (input.decision === "ACCEPT") decisionLabel = "Accepted";
    else if (input.decision === "REVISE" || input.decision.includes("REVISION"))
      decisionLabel = "Revision Requested";
    else if (input.decision === "REJECT") decisionLabel = "Rejected";

    await createNotification(
      {
        userId: submission.ownerId,
        journalId: submission.journalId,
        type: "EDITORIAL_DECISION",
        title: "Editorial Decision Issued",
        message: `An editorial decision (${decisionLabel}) has been issued for ${titleText}.`,
        actionUrl: `/author/submissions/${submission.id}`,
        resourceType: "Submission",
        resourceId: submission.id,
        idempotencyKey: generateIdempotencyKey({
          userId: submission.ownerId,
          type: "EDITORIAL_DECISION",
          resourceId: submission.id,
          eventQualifier: `round-${roundNumber}`,
        }),
      },
      client,
    );
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch EDITORIAL_DECISION for submission ${input.submissionId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * 9. Event: Revision Submitted
 * Target: Super Admins + Journal Admins + Assigned Reviewers.
 */
export async function handleRevisionSubmitted(
  input: {
    submissionId: string;
    roundNumber?: number;
  },
  db?: unknown,
): Promise<void> {
  try {
    const client = await getDb(db);
    const submission = await client.submission.findUnique({
      where: { id: input.submissionId },
      select: {
        id: true,
        title: true,
        journalId: true,
        journal: { select: { slug: true } },
      },
    });

    if (!submission) return;

    const [superAdmins, journalAdmins, editors] = await Promise.all([
      resolveSuperAdminRecipients(client),
      submission.journalId
        ? resolveJournalAdminRecipients(submission.journalId, client)
        : Promise.resolve([]),
      resolveManuscriptRecipients(
        submission.id,
        { includeAuthor: false, includeAssignedEditors: true },
        client,
      ),
    ]);

    const recipientIds = Array.from(
      new Set([...superAdmins, ...journalAdmins, ...editors]),
    );
    const journalSlug = submission.journal?.slug || "general";
    const titleText = submission.title
      ? `"${submission.title}"`
      : "a manuscript";
    const roundNumber = input.roundNumber || 1;

    for (const userId of recipientIds) {
      await createNotification(
        {
          userId,
          journalId: submission.journalId,
          type: "REVISION_SUBMITTED",
          title: "Revised Manuscript Submitted",
          message: `The author submitted a revised manuscript for ${titleText}.`,
          actionUrl: `/admin/${journalSlug}/submissions/${submission.id}`,
          resourceType: "Submission",
          resourceId: submission.id,
          idempotencyKey: generateIdempotencyKey({
            userId,
            type: "REVISION_SUBMITTED",
            resourceId: submission.id,
            eventQualifier: `round-${roundNumber}`,
          }),
        },
        client,
      );
    }
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch REVISION_SUBMITTED for submission ${input.submissionId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * 10. Event: Article Published
 * Target: Submitting Author.
 */
export async function handleArticlePublished(
  input: {
    articleId: string;
    submissionId?: string;
    title: string;
    articleSlug: string;
    journalId?: string;
  },
  db?: unknown,
): Promise<void> {
  try {
    const client = await getDb(db);
    let authorId: string | null = null;
    let journalId = input.journalId;

    if (input.submissionId) {
      const submission = await client.submission.findUnique({
        where: { id: input.submissionId },
        select: { ownerId: true, journalId: true },
      });
      if (submission) {
        authorId = submission.ownerId;
        journalId = journalId || submission.journalId;
      }
    }

    if (!authorId) return;

    await createNotification(
      {
        userId: authorId,
        journalId: journalId || null,
        type: "ARTICLE_PUBLISHED",
        title: "Article Published",
        message: `Congratulations! Your article "${input.title}" has been published in IMSU FOSS Journals.`,
        actionUrl: `/articles/${input.articleSlug}`,
        resourceType: "Article",
        resourceId: input.articleId,
        idempotencyKey: generateIdempotencyKey({
          userId: authorId,
          type: "ARTICLE_PUBLISHED",
          resourceId: input.articleId,
        }),
      },
      client,
    );
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch ARTICLE_PUBLISHED for article ${input.articleId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * 11. Event: Request Conversation Message Sent
 * Target: Author (if sent by admin) OR Administrators (if sent by author).
 * Excludes the sender.
 */
export async function handleRequestMessageSent(
  input: {
    requestId: string;
    messageId?: string;
    senderId: string;
    senderName?: string;
  },
  db?: unknown,
): Promise<void> {
  try {
    const client = await getDb(db);
    const request = await client.submissionRequest.findUnique({
      where: { id: input.requestId },
      select: {
        id: true,
        authorId: true,
        journalId: true,
        journal: { select: { slug: true, shortName: true } },
      },
    });

    if (!request) return;

    const isAuthorSender = input.senderId === request.authorId;
    const journalSlug = request.journal?.slug || "general";
    const senderLabel =
      input.senderName || (isAuthorSender ? "The author" : "Editorial staff");
    const eventQualifier = input.messageId?.trim() || undefined;

    if (isAuthorSender) {
      // Author sent message -> Notify Super Admins + Journal Admins
      const [superAdmins, journalAdmins] = await Promise.all([
        resolveSuperAdminRecipients(client),
        request.journalId
          ? resolveJournalAdminRecipients(request.journalId, client)
          : Promise.resolve([]),
      ]);

      const recipientIds = Array.from(
        new Set([...superAdmins, ...journalAdmins]),
      ).filter((id) => id !== input.senderId);

      for (const userId of recipientIds) {
        await createNotification(
          {
            userId,
            journalId: request.journalId,
            type: "REQUEST_MESSAGE",
            title: "New Request Query",
            message: `${senderLabel} sent a new message in request ${request.id}.`,
            actionUrl: `/admin/${journalSlug}/requests/${request.id}`,
            resourceType: "SubmissionRequest",
            resourceId: request.id,
            idempotencyKey: generateIdempotencyKey({
              userId,
              type: "REQUEST_MESSAGE",
              resourceId: request.id,
              eventQualifier,
            }),
          },
          client,
        );
      }
    } else {
      // Admin sent message -> Notify Author
      if (request.authorId && request.authorId !== input.senderId) {
        await createNotification(
          {
            userId: request.authorId,
            journalId: request.journalId,
            type: "REQUEST_MESSAGE",
            title: "New Editorial Message",
            message: `${senderLabel} replied to your submission request.`,
            actionUrl: `/author/requests/${request.id}`,
            resourceType: "SubmissionRequest",
            resourceId: request.id,
            idempotencyKey: generateIdempotencyKey({
              userId: request.authorId,
              type: "REQUEST_MESSAGE",
              resourceId: request.id,
              eventQualifier,
            }),
          },
          client,
        );
      }
    }
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch REQUEST_MESSAGE for request ${input.requestId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * 12. Event: Internal Editorial Chat Message Sent
 * Target: Journal Staff (Super Admins, Journal Admins, Editors of this journal).
 * Excludes the sender.
 */
export async function handleInternalChatMessageSent(
  input: {
    journalId: string;
    messageId: string;
    senderId: string;
    senderName?: string;
  },
  db?: unknown,
): Promise<void> {
  try {
    const client = await getDb(db);
    const journal = await client.journal.findUnique({
      where: { id: input.journalId },
      select: { id: true, slug: true, shortName: true },
    });

    if (!journal) return;

    // Resolve Super Admins + Journal Admins + Editors for this journal
    const [superAdmins, journalStaff] = await Promise.all([
      resolveSuperAdminRecipients(client),
      client.journalRoleAssignment.findMany({
        where: {
          journalId: journal.id,
          role: { in: ["JOURNAL_ADMIN", "EDITOR"] },
        },
        select: { userId: true },
      }),
    ]);

    const staffUserIds = journalStaff.map((s: { userId: string }) => s.userId);
    const recipientIds = Array.from(
      new Set([...superAdmins, ...staffUserIds]),
    ).filter((id) => id !== input.senderId);

    const senderLabel = input.senderName || "A team member";

    for (const userId of recipientIds) {
      await createNotification(
        {
          userId,
          journalId: journal.id,
          type: "INTERNAL_CHAT_MESSAGE",
          title: "New Internal Staff Message",
          message: `${senderLabel} posted in the ${journal.shortName} internal editorial chat.`,
          actionUrl: `/admin/${journal.slug}/chat`,
          resourceType: "InternalChatMessage",
          resourceId: input.messageId,
          idempotencyKey: generateIdempotencyKey({
            userId,
            type: "INTERNAL_CHAT_MESSAGE",
            resourceId: input.messageId,
          }),
        },
        client,
      );
    }
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch INTERNAL_CHAT_MESSAGE for journal ${input.journalId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * 13. Event: Reviewer Application Received
 * Target: Super Admins + Journal Admins of the target journal.
 */
export async function handleReviewerApplicationReceived(
  input: {
    applicationId: string;
    applicantName: string;
    targetJournal: string;
  },
  db?: unknown,
): Promise<void> {
  try {
    const client = await getDb(db);
    const superAdmins = await resolveSuperAdminRecipients(client);

    let journalAdmins: string[] = [];
    let journalId: string | null = null;

    if (input.targetJournal && input.targetJournal !== "ALL") {
      const journal = await client.journal.findFirst({
        where: { slug: input.targetJournal },
        select: { id: true },
      });
      if (journal) {
        journalId = journal.id;
        journalAdmins = await resolveJournalAdminRecipients(journal.id, client);
      }
    }

    const recipientIds = Array.from(
      new Set([...superAdmins, ...journalAdmins]),
    );

    for (const userId of recipientIds) {
      await createNotification(
        {
          userId,
          journalId,
          type: "REVIEWER_APPLICATION_RECEIVED",
          title: "New Reviewer Application",
          message: `${input.applicantName} submitted an application to join the peer reviewer pool for ${input.targetJournal}.`,
          actionUrl: "/admin/reviewers",
          resourceType: "ReviewerApplication",
          resourceId: input.applicationId,
          idempotencyKey: generateIdempotencyKey({
            userId,
            type: "REVIEWER_APPLICATION_RECEIVED",
            resourceId: input.applicationId,
          }),
        },
        client,
      );
    }
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch REVIEWER_APPLICATION_RECEIVED for app ${input.applicationId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * 14. Event: Reviewer Application Status Changed
 * Target: Applicant (if user account is linked).
 */
export async function handleReviewerApplicationStatusChanged(
  input: {
    applicationId: string;
    applicantUserId?: string | null;
    status: string;
    targetJournal: string;
  },
  db?: unknown,
): Promise<void> {
  try {
    if (!input.applicantUserId) return;

    const client = await getDb(db);
    const statusLabel =
      input.status === "APPROVED"
        ? "approved! You now have Editor workspace privileges."
        : input.status === "DECLINED"
          ? "declined by the editorial board."
          : `marked as ${input.status.toLowerCase()}.`;

    await createNotification(
      {
        userId: input.applicantUserId,
        type: "REVIEWER_APPLICATION_STATUS",
        title: "Reviewer Application Update",
        message: `Your reviewer application for ${input.targetJournal} has been ${statusLabel}`,
        actionUrl: "/author/apply-reviewer",
        resourceType: "ReviewerApplication",
        resourceId: input.applicationId,
        idempotencyKey: generateIdempotencyKey({
          userId: input.applicantUserId,
          type: "REVIEWER_APPLICATION_STATUS",
          resourceId: input.applicationId,
          eventQualifier: input.status,
        }),
      },
      client,
    );
  } catch (error) {
    console.error(
      `[Notification Error] Failed to dispatch REVIEWER_APPLICATION_STATUS for app ${input.applicationId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}
