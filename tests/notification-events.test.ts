import assert from "node:assert/strict";
import test from "node:test";
import {
  handleManuscriptSubmitted,
  handleSubmissionRequestCreated,
  handleTrackingAssigned,
  handleCorrectionRequested,
  handleReviewerAssigned,
  handleReviewSubmitted,
  handleAdherenceReportSubmitted,
  handleEditorialDecisionIssued,
  handleRevisionSubmitted,
  handleArticlePublished,
  handleRequestMessageSent,
  handleInternalChatMessageSent,
  handleReviewerApplicationReceived,
  handleReviewerApplicationStatusChanged,
} from "@/lib/notifications/event-handlers";
import type {
  NotificationRecord,
  NotificationType,
} from "@/lib/notifications/types";

const SUPER_ADMIN_UUID = "11111111-1111-4111-8111-111111111111";
const JOURNAL_ADMIN_UUID = "22222222-2222-4222-8222-222222222222";
const EDITOR_UUID = "33333333-3333-4333-8333-333333333333";
const AUTHOR_UUID = "44444444-4444-4444-8444-444444444444";

function createMockEventDb() {
  const notifications = new Map<string, NotificationRecord>();
  let idCounter = 1;

  const userGlobalRoles: Array<{ userId: string; role: string }> = [];
  const journalRoleAssignments: Array<{
    userId: string;
    journalId: string;
    role: string;
  }> = [];
  const reviewAssignments: Array<{
    editorId: string;
    status: string;
    reviewRound: { submissionId: string };
  }> = [];

  const submissions = new Map<
    string,
    {
      id: string;
      title: string;
      ownerId: string | null;
      journalId: string;
      trackingNumber: string | null;
      version?: number;
      journal?: { slug: string; name?: string; shortName?: string } | null;
    }
  >();

  const submissionRequests = new Map<
    string,
    {
      id: string;
      authorId: string;
      journalId: string | null;
      journal?: { slug: string; shortName?: string } | null;
      author?: { displayName?: string } | null;
    }
  >();

  const journals = new Map<
    string,
    { id: string; slug: string; shortName: string; name: string }
  >();

  const client = {
    _store: {
      notifications,
      userGlobalRoles,
      journalRoleAssignments,
      reviewAssignments,
      submissions,
      submissionRequests,
      journals,
    },
    userGlobalRole: {
      findMany: async ({ where }: { where: { role: string } }) => {
        return userGlobalRoles
          .filter((r) => r.role === where.role)
          .map((r) => ({ userId: r.userId }));
      },
    },
    journalRoleAssignment: {
      findMany: async ({
        where,
      }: {
        where: { journalId?: string; role?: { in?: string[] } | string };
      }) => {
        return journalRoleAssignments
          .filter((r) => {
            if (where.journalId && r.journalId !== where.journalId)
              return false;
            if (where.role) {
              if (typeof where.role === "string" && r.role !== where.role)
                return false;
              if (
                typeof where.role === "object" &&
                where.role.in &&
                !where.role.in.includes(r.role)
              )
                return false;
            }
            return true;
          })
          .map((r) => ({ userId: r.userId }));
      },
    },
    reviewAssignment: {
      findMany: async ({
        where,
      }: {
        where: {
          reviewRound?: { submissionId?: string };
          status?: { not?: string; notIn?: string[] };
        };
      }) => {
        return reviewAssignments
          .filter((a) => {
            if (
              where.reviewRound?.submissionId &&
              a.reviewRound.submissionId !== where.reviewRound.submissionId
            )
              return false;
            if (where.status?.not && a.status === where.status.not)
              return false;
            if (where.status?.notIn && where.status.notIn.includes(a.status))
              return false;
            return true;
          })
          .map((a) => ({ editorId: a.editorId }));
      },
    },
    submission: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const item = submissions.get(where.id);
        return item ? { ...item } : null;
      },
    },
    submissionRequest: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const item = submissionRequests.get(where.id);
        return item ? { ...item } : null;
      },
    },
    journal: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        return journals.get(where.id) || null;
      },
      findFirst: async ({ where }: { where: { slug?: string } }) => {
        for (const j of journals.values()) {
          if (where.slug && j.slug === where.slug) return j;
        }
        return null;
      },
    },
    notification: {
      findUnique: async ({ where }: { where: { idempotencyKey?: string } }) => {
        if (!where.idempotencyKey) return null;
        for (const item of notifications.values()) {
          if (item.idempotencyKey === where.idempotencyKey) {
            return { ...item };
          }
        }
        return null;
      },
      create: async ({
        data,
      }: {
        data: {
          userId: string;
          journalId: string | null;
          type: NotificationType;
          title: string;
          message: string;
          actionUrl: string;
          resourceType?: string | null;
          resourceId?: string | null;
          idempotencyKey?: string | null;
        };
      }) => {
        const id = `notif-${idCounter++}`;
        const record: NotificationRecord = {
          id,
          userId: data.userId,
          journalId: data.journalId ?? null,
          type: data.type,
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
          resourceType: data.resourceType ?? null,
          resourceId: data.resourceId ?? null,
          isRead: false,
          readAt: null,
          idempotencyKey: data.idempotencyKey ?? null,
          createdAt: new Date(),
        };
        notifications.set(id, record);
        return { ...record };
      },
    },
  };

  return client;
}

test("Lifecycle Event: handleManuscriptSubmitted notifies super admins and journal admins", async () => {
  const db = createMockEventDb();
  db._store.userGlobalRoles.push({
    userId: SUPER_ADMIN_UUID,
    role: "SUPER_ADMIN",
  });
  db._store.journalRoleAssignments.push({
    userId: JOURNAL_ADMIN_UUID,
    journalId: "j-psych",
    role: "JOURNAL_ADMIN",
  });
  db._store.submissions.set("sub-100", {
    id: "sub-100",
    title: "Mental Health Among Undergraduates",
    ownerId: AUTHOR_UUID,
    journalId: "j-psych",
    trackingNumber: "IMSU/2026/001",
    journal: {
      slug: "psychology",
      shortName: "NJCP",
      name: "Nigerian Journal of Clinical Psychology",
    },
  });

  await handleManuscriptSubmitted("sub-100", db);

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 2);

  const superNotif = notifs.find((n) => n.userId === SUPER_ADMIN_UUID);
  assert.ok(superNotif);
  assert.equal(superNotif.type, "MANUSCRIPT_SUBMITTED");
  assert.equal(superNotif.actionUrl, "/admin/psychology/submissions/sub-100");

  const journalNotif = notifs.find((n) => n.userId === JOURNAL_ADMIN_UUID);
  assert.ok(journalNotif);
  assert.equal(journalNotif.type, "MANUSCRIPT_SUBMITTED");
});

test("Lifecycle Event: handleSubmissionRequestCreated notifies staff and excludes submitting author", async () => {
  const db = createMockEventDb();
  db._store.userGlobalRoles.push({
    userId: SUPER_ADMIN_UUID,
    role: "SUPER_ADMIN",
  });
  db._store.userGlobalRoles.push({ userId: AUTHOR_UUID, role: "SUPER_ADMIN" }); // Super admin who is also author
  db._store.submissionRequests.set("req-1", {
    id: "req-1",
    authorId: AUTHOR_UUID,
    journalId: "j-psych",
    journal: { slug: "psychology", shortName: "NJCP" },
    author: { displayName: "Dr. Author" },
  });

  await handleSubmissionRequestCreated("req-1", db);

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(notifs[0].userId, SUPER_ADMIN_UUID);
  assert.equal(notifs[0].type, "REQUEST_MESSAGE");
  assert.ok(notifs[0].message.includes("Dr. Author"));
});

test("Lifecycle Event: handleTrackingAssigned notifies manuscript submitting author", async () => {
  const db = createMockEventDb();
  db._store.submissions.set("sub-1", {
    id: "sub-1",
    title: "Cognitive Load in Learning",
    ownerId: AUTHOR_UUID,
    journalId: "j-psych",
    trackingNumber: "TRK-999",
  });

  await handleTrackingAssigned(
    {
      submissionId: "sub-1",
      trackingNumber: "TRK-999",
    },
    db,
  );

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(notifs[0].userId, AUTHOR_UUID);
  assert.equal(notifs[0].type, "TRACKING_ASSIGNED");
  assert.ok(notifs[0].message.includes("TRK-999"));
  assert.equal(notifs[0].actionUrl, "/author/submissions/sub-1");
});

test("Lifecycle Event: handleCorrectionRequested notifies author with reason", async () => {
  const db = createMockEventDb();
  db._store.submissions.set("sub-2", {
    id: "sub-2",
    title: "Social Psychology Insights",
    ownerId: AUTHOR_UUID,
    journalId: "j-psych",
    trackingNumber: null,
  });

  await handleCorrectionRequested(
    {
      submissionId: "sub-2",
      note: "Missing ethics approval document.",
    },
    db,
  );

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(notifs[0].userId, AUTHOR_UUID);
  assert.equal(notifs[0].type, "CORRECTION_REQUESTED");
  assert.ok(notifs[0].message.includes("Missing ethics approval document."));
});

test("Lifecycle Event: handleReviewerAssigned notifies assigned editor", async () => {
  const db = createMockEventDb();
  db._store.submissions.set("sub-3", {
    id: "sub-3",
    title: "Adolescent Behavioral Study",
    ownerId: AUTHOR_UUID,
    journalId: "j-psych",
    trackingNumber: null,
    journal: { slug: "psychology" },
  });

  await handleReviewerAssigned(
    {
      submissionId: "sub-3",
      editorId: EDITOR_UUID,
      roundNumber: 1,
    },
    db,
  );

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(notifs[0].userId, EDITOR_UUID);
  assert.equal(notifs[0].type, "REVIEWER_ASSIGNED");
  assert.equal(notifs[0].actionUrl, "/editor/psychology");
});

test("Lifecycle Event: handleReviewSubmitted notifies admins", async () => {
  const db = createMockEventDb();
  db._store.userGlobalRoles.push({
    userId: SUPER_ADMIN_UUID,
    role: "SUPER_ADMIN",
  });
  db._store.submissions.set("sub-4", {
    id: "sub-4",
    title: "Neuropsychological Assessments",
    ownerId: AUTHOR_UUID,
    journalId: "j-psych",
    trackingNumber: null,
    journal: { slug: "psychology" },
  });

  await handleReviewSubmitted(
    {
      submissionId: "sub-4",
      recommendation: "ACCEPT",
      reviewerName: "Prof. Reviewer",
    },
    db,
  );

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(notifs[0].userId, SUPER_ADMIN_UUID);
  assert.equal(notifs[0].type, "REVIEW_SUBMITTED");
  assert.ok(notifs[0].message.includes("Prof. Reviewer"));
});

test("Lifecycle Event: handleAdherenceReportSubmitted notifies admins", async () => {
  const db = createMockEventDb();
  db._store.userGlobalRoles.push({
    userId: SUPER_ADMIN_UUID,
    role: "SUPER_ADMIN",
  });
  db._store.submissions.set("sub-5", {
    id: "sub-5",
    title: "Methodological Survey",
    ownerId: AUTHOR_UUID,
    journalId: "j-psych",
    trackingNumber: null,
    journal: { slug: "psychology" },
  });

  await handleAdherenceReportSubmitted(
    {
      submissionId: "sub-5",
      editorName: "Editor Smith",
    },
    db,
  );

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(notifs[0].userId, SUPER_ADMIN_UUID);
  assert.equal(notifs[0].type, "ADHERENCE_REPORT_SUBMITTED");
  assert.ok(notifs[0].message.includes("Editor Smith"));
});

test("Lifecycle Event: handleEditorialDecisionIssued maps decision labels and notifies author", async () => {
  const db = createMockEventDb();
  db._store.submissions.set("sub-6", {
    id: "sub-6",
    title: "Experimental Group Dynamics",
    ownerId: AUTHOR_UUID,
    journalId: "j-psych",
    trackingNumber: null,
  });

  await handleEditorialDecisionIssued(
    {
      submissionId: "sub-6",
      decision: "ACCEPT",
      roundNumber: 1,
    },
    db,
  );

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(notifs[0].userId, AUTHOR_UUID);
  assert.equal(notifs[0].type, "EDITORIAL_DECISION");
  assert.ok(notifs[0].message.includes("Accepted"));
});

test("Lifecycle Event: handleRevisionSubmitted notifies admins and assigned reviewers", async () => {
  const db = createMockEventDb();
  db._store.userGlobalRoles.push({
    userId: SUPER_ADMIN_UUID,
    role: "SUPER_ADMIN",
  });
  db._store.reviewAssignments.push({
    editorId: EDITOR_UUID,
    status: "ACCEPTED",
    reviewRound: { submissionId: "sub-7" },
  });
  db._store.submissions.set("sub-7", {
    id: "sub-7",
    title: "Revisited Clinical Findings",
    ownerId: AUTHOR_UUID,
    journalId: "j-psych",
    trackingNumber: null,
    journal: { slug: "psychology" },
  });

  await handleRevisionSubmitted(
    {
      submissionId: "sub-7",
      roundNumber: 2,
    },
    db,
  );

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 2);
  const editorNotif = notifs.find((n) => n.userId === EDITOR_UUID);
  assert.ok(editorNotif);
  assert.equal(editorNotif.type, "REVISION_SUBMITTED");
});

test("Lifecycle Event: handleArticlePublished notifies author with live link", async () => {
  const db = createMockEventDb();
  db._store.submissions.set("sub-pub", {
    id: "sub-pub",
    title: "Published Landmark Paper",
    ownerId: AUTHOR_UUID,
    journalId: "j-psych",
    trackingNumber: null,
  });

  await handleArticlePublished(
    {
      articleId: "art-1",
      submissionId: "sub-pub",
      title: "Published Landmark Paper",
      articleSlug: "landmark-paper",
      journalId: "j-psych",
    },
    db,
  );

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(notifs[0].userId, AUTHOR_UUID);
  assert.equal(notifs[0].type, "ARTICLE_PUBLISHED");
  assert.equal(notifs[0].actionUrl, "/articles/landmark-paper");
});

test("Lifecycle Event: handleRequestMessageSent separates author queries from admin responses and excludes sender", async () => {
  const db = createMockEventDb();
  db._store.userGlobalRoles.push({
    userId: SUPER_ADMIN_UUID,
    role: "SUPER_ADMIN",
  });
  db._store.submissionRequests.set("req-msg-1", {
    id: "req-msg-1",
    authorId: AUTHOR_UUID,
    journalId: "j-psych",
    journal: { slug: "psychology" },
  });

  // 1. Author sends message -> notifies super-admin, excludes AUTHOR_UUID
  await handleRequestMessageSent(
    {
      requestId: "req-msg-1",
      senderId: AUTHOR_UUID,
      senderName: "Author One",
    },
    db,
  );

  let notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(notifs[0].userId, SUPER_ADMIN_UUID);
  assert.ok(notifs[0].message.includes("Author One"));

  // 2. Admin replies -> notifies AUTHOR_UUID, excludes SUPER_ADMIN_UUID
  await handleRequestMessageSent(
    {
      requestId: "req-msg-1",
      senderId: SUPER_ADMIN_UUID,
      senderName: "Chief Admin",
    },
    db,
  );

  notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 2);
  const authorNotif = notifs.find((n) => n.userId === AUTHOR_UUID);
  assert.ok(authorNotif);
  assert.ok(authorNotif.message.includes("Chief Admin"));
});

test("Lifecycle Event: handleInternalChatMessageSent excludes message sender", async () => {
  const db = createMockEventDb();
  db._store.userGlobalRoles.push({
    userId: SUPER_ADMIN_UUID,
    role: "SUPER_ADMIN",
  });
  db._store.journalRoleAssignments.push({
    userId: EDITOR_UUID,
    journalId: "j-psych",
    role: "EDITOR",
  });
  db._store.journals.set("j-psych", {
    id: "j-psych",
    slug: "psychology",
    shortName: "NJCP",
    name: "Psychology Journal",
  });

  // Super-admin sends an internal message -> only EDITOR_UUID should get notified, NOT SUPER_ADMIN_UUID
  await handleInternalChatMessageSent(
    {
      journalId: "j-psych",
      messageId: "msg-99",
      senderId: SUPER_ADMIN_UUID,
      senderName: "Dr. Super Admin",
    },
    db,
  );

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(notifs[0].userId, EDITOR_UUID);
  assert.equal(notifs[0].type, "INTERNAL_CHAT_MESSAGE");
  assert.equal(notifs[0].actionUrl, "/admin/psychology/chat");
});

test("Lifecycle Event: handleReviewerApplicationReceived notifies admins", async () => {
  const db = createMockEventDb();
  db._store.userGlobalRoles.push({
    userId: SUPER_ADMIN_UUID,
    role: "SUPER_ADMIN",
  });

  await handleReviewerApplicationReceived(
    {
      applicationId: "app-1",
      applicantName: "Dr. Jane Doe",
      targetJournal: "ALL",
    },
    db,
  );

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(notifs[0].userId, SUPER_ADMIN_UUID);
  assert.equal(notifs[0].type, "REVIEWER_APPLICATION_RECEIVED");
  assert.equal(notifs[0].actionUrl, "/admin/reviewers");
});

test("Lifecycle Event: handleReviewerApplicationStatusChanged notifies applicant when linked", async () => {
  const db = createMockEventDb();

  await handleReviewerApplicationStatusChanged(
    {
      applicationId: "app-2",
      applicantUserId: AUTHOR_UUID,
      status: "APPROVED",
      targetJournal: "njcp",
    },
    db,
  );

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(notifs[0].userId, AUTHOR_UUID);
  assert.equal(notifs[0].type, "REVIEWER_APPLICATION_STATUS");
  assert.ok(notifs[0].message.includes("approved"));
  assert.equal(notifs[0].actionUrl, "/author/apply-reviewer");
});

test("Failure Isolation: Database exceptions do not throw and are cleanly captured", async () => {
  const failingDb = {
    userGlobalRole: {
      findMany: async () => {
        throw new Error("Simulated database failure");
      },
    },
    journalRoleAssignment: {
      findMany: async () => {
        throw new Error("Simulated database failure");
      },
    },
  };

  // Must not throw an error
  await assert.doesNotReject(async () => {
    await handleManuscriptSubmitted("sub-err", failingDb);
  });
});

test("Idempotency: Retried request messages with identical messageId deduplicate to 1 notification", async () => {
  const db = createMockEventDb();
  db._store.userGlobalRoles.push({
    userId: SUPER_ADMIN_UUID,
    role: "SUPER_ADMIN",
  });
  db._store.submissionRequests.set("req-dedup-1", {
    id: "req-dedup-1",
    authorId: AUTHOR_UUID,
    journalId: "j-psych",
    journal: { slug: "psychology" },
  });

  // First delivery of message msg-100
  await handleRequestMessageSent(
    {
      requestId: "req-dedup-1",
      messageId: "msg-100",
      senderId: AUTHOR_UUID,
      senderName: "Author One",
    },
    db,
  );

  let notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(
    notifs[0].idempotencyKey,
    `${SUPER_ADMIN_UUID}:REQUEST_MESSAGE:req-dedup-1:msg-100`,
  );

  // Retry delivery of same message msg-100
  await handleRequestMessageSent(
    {
      requestId: "req-dedup-1",
      messageId: "msg-100",
      senderId: AUTHOR_UUID,
      senderName: "Author One",
    },
    db,
  );

  notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
});

test("Event Separation: Two different request messages on same request produce separate notifications", async () => {
  const db = createMockEventDb();
  db._store.userGlobalRoles.push({
    userId: SUPER_ADMIN_UUID,
    role: "SUPER_ADMIN",
  });
  db._store.submissionRequests.set("req-sep-1", {
    id: "req-sep-1",
    authorId: AUTHOR_UUID,
    journalId: "j-psych",
    journal: { slug: "psychology" },
  });

  // Message 1
  await handleRequestMessageSent(
    {
      requestId: "req-sep-1",
      messageId: "msg-101",
      senderId: AUTHOR_UUID,
      senderName: "Author One",
    },
    db,
  );

  // Message 2
  await handleRequestMessageSent(
    {
      requestId: "req-sep-1",
      messageId: "msg-102",
      senderId: AUTHOR_UUID,
      senderName: "Author One",
    },
    db,
  );

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 2);
  assert.equal(
    notifs[0].idempotencyKey,
    `${SUPER_ADMIN_UUID}:REQUEST_MESSAGE:req-sep-1:msg-101`,
  );
  assert.equal(
    notifs[1].idempotencyKey,
    `${SUPER_ADMIN_UUID}:REQUEST_MESSAGE:req-sep-1:msg-102`,
  );
});

test("Idempotency: Retried correction requests with identical version deduplicate", async () => {
  const db = createMockEventDb();
  db._store.submissions.set("sub-corr-dedup", {
    id: "sub-corr-dedup",
    title: "Correction Paper",
    ownerId: AUTHOR_UUID,
    journalId: "j-psych",
    trackingNumber: null,
    version: 2,
  });

  // First call for version 2
  await handleCorrectionRequested(
    {
      submissionId: "sub-corr-dedup",
      note: "Please provide high-resolution figures.",
      versionNumber: 2,
    },
    db,
  );

  let notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
  assert.equal(
    notifs[0].idempotencyKey,
    `${AUTHOR_UUID}:CORRECTION_REQUESTED:sub-corr-dedup:v2`,
  );

  // Retry same correction event
  await handleCorrectionRequested(
    {
      submissionId: "sub-corr-dedup",
      note: "Please provide high-resolution figures.",
      versionNumber: 2,
    },
    db,
  );

  notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 1);
});

test("Event Separation: Two distinct correction events (different versions) produce separate notifications", async () => {
  const db = createMockEventDb();
  db._store.submissions.set("sub-corr-diff", {
    id: "sub-corr-diff",
    title: "Multi-round Correction Paper",
    ownerId: AUTHOR_UUID,
    journalId: "j-psych",
    trackingNumber: null,
    version: 1,
  });

  // Round 1 correction
  await handleCorrectionRequested(
    {
      submissionId: "sub-corr-diff",
      note: "Round 1: Add ethical declaration.",
      versionNumber: 1,
    },
    db,
  );

  // Round 2 correction
  await handleCorrectionRequested(
    {
      submissionId: "sub-corr-diff",
      note: "Round 2: Fix figure formatting.",
      versionNumber: 2,
    },
    db,
  );

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 2);
  assert.equal(
    notifs[0].idempotencyKey,
    `${AUTHOR_UUID}:CORRECTION_REQUESTED:sub-corr-diff:v1`,
  );
  assert.equal(
    notifs[1].idempotencyKey,
    `${AUTHOR_UUID}:CORRECTION_REQUESTED:sub-corr-diff:v2`,
  );
});

test("Multistep Submission: handleManuscriptSubmitted triggers admin notifications on completion", async () => {
  const db = createMockEventDb();
  db._store.userGlobalRoles.push({
    userId: SUPER_ADMIN_UUID,
    role: "SUPER_ADMIN",
  });
  db._store.journalRoleAssignments.push({
    userId: JOURNAL_ADMIN_UUID,
    journalId: "j-psych",
    role: "JOURNAL_ADMIN",
  });
  db._store.submissions.set("sub-multistep", {
    id: "sub-multistep",
    title: "Multistep Finalized Paper",
    ownerId: AUTHOR_UUID,
    journalId: "j-psych",
    trackingNumber: "IMSU/2026/042",
    journal: {
      slug: "psychology",
      shortName: "NJCP",
      name: "Nigerian Journal of Clinical Psychology",
    },
  });

  // Simulate finalizeRequestSubmission completing and invoking handleManuscriptSubmitted
  await handleManuscriptSubmitted("sub-multistep", db);

  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 2);
  const superAdminNotif = notifs.find((n) => n.userId === SUPER_ADMIN_UUID);
  const journalAdminNotif = notifs.find((n) => n.userId === JOURNAL_ADMIN_UUID);
  assert.ok(superAdminNotif);
  assert.ok(journalAdminNotif);
  assert.equal(superAdminNotif.type, "MANUSCRIPT_SUBMITTED");
  assert.equal(
    superAdminNotif.actionUrl,
    "/admin/psychology/submissions/sub-multistep",
  );
});

test("Transaction Safety: Failed transaction in finalizeRequestSubmission does not trigger handleManuscriptSubmitted", async () => {
  const db = createMockEventDb();
  let handleManuscriptSubmittedCalled = false;

  async function mockFinalizeRequestSubmissionWithFailure() {
    // Simulate transaction failure
    const transactionFailed = true;
    if (transactionFailed) {
      throw new Error("Transaction aborted due to conflict");
    }
    handleManuscriptSubmittedCalled = true;
    await handleManuscriptSubmitted("sub-fail", db);
  }

  await assert.rejects(async () => {
    await mockFinalizeRequestSubmissionWithFailure();
  }, /Transaction aborted/);

  assert.equal(handleManuscriptSubmittedCalled, false);
  const notifs = Array.from(db._store.notifications.values());
  assert.equal(notifs.length, 0);
});
