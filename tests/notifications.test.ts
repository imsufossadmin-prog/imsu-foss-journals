import assert from "node:assert/strict";
import test from "node:test";
import {
  createNotification,
  generateIdempotencyKey,
  getUnreadCount,
  isSafeInternalActionUrl,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NotificationValidationError,
  resolveJournalAdminRecipients,
  resolveManuscriptRecipients,
  resolveRequestRecipients,
  resolveSuperAdminRecipients,
} from "@/lib/notifications";
import type {
  NotificationRecord,
  NotificationType,
} from "@/lib/notifications/types";

// Helper to create an in-memory test database client
function createInMemoryNotificationDb() {
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
    { id: string; ownerId: string; journalId: string }
  >();
  const submissionRequests = new Map<
    string,
    { id: string; authorId: string; journalId: string }
  >();

  const client = {
    _store: {
      notifications,
      userGlobalRoles,
      journalRoleAssignments,
      reviewAssignments,
      submissions,
      submissionRequests,
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
      findFirst: async ({
        where,
      }: {
        where: { id?: string; userId?: string; idempotencyKey?: string };
      }) => {
        for (const item of notifications.values()) {
          let match = true;
          if (where.id && item.id !== where.id) match = false;
          if (where.userId && item.userId !== where.userId) match = false;
          if (
            where.idempotencyKey &&
            item.idempotencyKey !== where.idempotencyKey
          )
            match = false;
          if (match) return { ...item };
        }
        return null;
      },
      findMany: async ({
        where,
        orderBy,
        skip = 0,
        take = 25,
      }: {
        where: { userId: string; isRead?: boolean };
        orderBy?: { createdAt: "asc" | "desc" };
        skip?: number;
        take?: number;
      }) => {
        const results = Array.from(notifications.values()).filter((item) => {
          if (item.userId !== where.userId) return false;
          if (typeof where.isRead === "boolean" && item.isRead !== where.isRead)
            return false;
          return true;
        });

        results.sort((a, b) => {
          const diff = b.createdAt.getTime() - a.createdAt.getTime();
          return orderBy?.createdAt === "asc" ? -diff : diff;
        });

        return results.slice(skip, skip + take).map((r) => ({ ...r }));
      },
      count: async ({
        where,
      }: {
        where: { userId: string; isRead?: boolean };
      }) => {
        return Array.from(notifications.values()).filter((item) => {
          if (item.userId !== where.userId) return false;
          if (typeof where.isRead === "boolean" && item.isRead !== where.isRead)
            return false;
          return true;
        }).length;
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
          resourceType: string | null;
          resourceId: string | null;
          idempotencyKey: string | null;
        };
      }) => {
        // Enforce unique constraint check on idempotencyKey
        if (data.idempotencyKey) {
          for (const item of notifications.values()) {
            if (item.idempotencyKey === data.idempotencyKey) {
              const err = Object.assign(
                new Error(
                  "Unique constraint failed on the fields: (`idempotencyKey`)",
                ),
                { code: "P2002" },
              );
              throw err;
            }
          }
        }
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
          idempotencyKey: data.idempotencyKey ?? null,
          isRead: false,
          readAt: null,
          createdAt: new Date(),
        };
        notifications.set(id, record);
        return { ...record };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { isRead: boolean; readAt: Date };
      }) => {
        const item = notifications.get(where.id);
        if (!item) throw new Error("Record to update not found.");
        const updated = { ...item, ...data };
        notifications.set(where.id, updated);
        return { ...updated };
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { userId: string; isRead?: boolean };
        data: { isRead: boolean; readAt: Date };
      }) => {
        let count = 0;
        for (const [id, item] of notifications.entries()) {
          if (item.userId !== where.userId) continue;
          if (typeof where.isRead === "boolean" && item.isRead !== where.isRead)
            continue;
          notifications.set(id, { ...item, ...data });
          count++;
        }
        return { count };
      },
    },
    userGlobalRole: {
      findMany: async ({ where }: { where: { role: string } }) => {
        return userGlobalRoles.filter((item) => item.role === where.role);
      },
    },
    journalRoleAssignment: {
      findMany: async ({
        where,
      }: {
        where: { journalId: string; role: string };
      }) => {
        return journalRoleAssignments.filter(
          (item) =>
            item.journalId === where.journalId && item.role === where.role,
        );
      },
    },
    reviewAssignment: {
      findMany: async ({
        where,
      }: {
        where: {
          reviewRound: { submissionId: string };
          status?: { notIn?: string[] };
        };
      }) => {
        return reviewAssignments.filter((item) => {
          if (item.reviewRound.submissionId !== where.reviewRound.submissionId)
            return false;
          if (where.status?.notIn?.includes(item.status)) return false;
          return true;
        });
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
  };

  return client;
}

const VALID_USER_UUID = "11111111-1111-4111-8111-111111111111";
const SECOND_USER_UUID = "22222222-2222-4222-8222-222222222222";
const THIRD_USER_UUID = "33333333-3333-4333-8333-333333333333";

test("Safe Action URL Validation: Correctly permits safe relative routes", () => {
  assert.equal(isSafeInternalActionUrl("/admin/submissions"), true);
  assert.equal(
    isSafeInternalActionUrl("/author/requests/req-123?tab=messages"),
    true,
  );
  assert.equal(
    isSafeInternalActionUrl("/editor/psychology/submissions/sub-456#round-1"),
    true,
  );
  assert.equal(isSafeInternalActionUrl("/"), true);
});

test("Safe Action URL Validation: Rejects dangerous schemes, external URLs, and protocol-relative links", () => {
  // Protocol-relative (open redirect vector)
  assert.equal(isSafeInternalActionUrl("//evil.com/phish"), false);
  assert.equal(isSafeInternalActionUrl("/\\evil.com"), false);

  // External schemes
  assert.equal(isSafeInternalActionUrl("https://evil.com"), false);
  assert.equal(isSafeInternalActionUrl("http://imsufoss.com"), false);
  assert.equal(isSafeInternalActionUrl("ftp://file-server.com"), false);

  // Script injection vectors
  assert.equal(isSafeInternalActionUrl("javascript:alert(1)"), false);
  assert.equal(isSafeInternalActionUrl("/javascript:alert(1)"), false);
  assert.equal(isSafeInternalActionUrl("data:text/html,<script>"), false);
  assert.equal(isSafeInternalActionUrl("vbscript:msgbox(1)"), false);

  // Control characters / backslash tricks
  assert.equal(isSafeInternalActionUrl("/admin\r\nSet-Cookie: test"), false);
  assert.equal(isSafeInternalActionUrl("/foo\\bar"), false);

  // Empty or invalid types
  assert.equal(isSafeInternalActionUrl(""), false);
  assert.equal(isSafeInternalActionUrl("   "), false);
  assert.equal(isSafeInternalActionUrl(null), false);
  assert.equal(isSafeInternalActionUrl(123), false);
});

test("Validation & Creation: Valid notification creation succeeds with in-memory DB", async () => {
  const db = createInMemoryNotificationDb();

  const result = await createNotification(
    {
      userId: VALID_USER_UUID,
      type: "MANUSCRIPT_SUBMITTED",
      title: "New Manuscript Received",
      message: "An author has submitted a manuscript for review.",
      actionUrl: "/admin/psychology/submissions/sub-100",
      journalId: "njcp",
      resourceType: "Submission",
      resourceId: "sub-100",
    },
    db,
  );

  assert.equal(result.duplicate, false);
  assert.equal(result.notification.userId, VALID_USER_UUID);
  assert.equal(result.notification.type, "MANUSCRIPT_SUBMITTED");
  assert.equal(result.notification.title, "New Manuscript Received");
  assert.equal(result.notification.isRead, false);
  assert.equal(result.notification.readAt, null);
  assert.ok(result.notification.id.startsWith("notif-"));
});

test("Validation: Rejects invalid UUID, invalid types, and malformed inputs", async () => {
  const db = createInMemoryNotificationDb();

  // Invalid UUID
  await assert.rejects(
    () =>
      createNotification(
        {
          userId: "not-a-uuid",
          type: "MANUSCRIPT_SUBMITTED",
          title: "Title",
          message: "Message",
          actionUrl: "/admin",
        },
        db,
      ),
    NotificationValidationError,
  );

  // Unknown notification type
  await assert.rejects(
    () =>
      createNotification(
        {
          userId: VALID_USER_UUID,
          type: "NON_EXISTENT_TYPE" as unknown as NotificationType,
          title: "Title",
          message: "Message",
          actionUrl: "/admin",
        },
        db,
      ),
    NotificationValidationError,
  );

  // Missing title
  await assert.rejects(
    () =>
      createNotification(
        {
          userId: VALID_USER_UUID,
          type: "MANUSCRIPT_SUBMITTED",
          title: "",
          message: "Message",
          actionUrl: "/admin",
        },
        db,
      ),
    NotificationValidationError,
  );

  // Unsafe action URL
  await assert.rejects(
    () =>
      createNotification(
        {
          userId: VALID_USER_UUID,
          type: "MANUSCRIPT_SUBMITTED",
          title: "Title",
          message: "Message",
          actionUrl: "https://evil.com/phish",
        },
        db,
      ),
    NotificationValidationError,
  );
});

test("Idempotency & Duplicate Prevention: Deterministic key generation and deduplication", async () => {
  const db = createInMemoryNotificationDb();

  const key1 = generateIdempotencyKey({
    userId: VALID_USER_UUID,
    type: "MANUSCRIPT_SUBMITTED",
    resourceId: "sub-999",
  });
  assert.equal(key1, `${VALID_USER_UUID}:MANUSCRIPT_SUBMITTED:sub-999`);

  const keyWithQualifier = generateIdempotencyKey({
    userId: VALID_USER_UUID,
    type: "EDITORIAL_DECISION",
    resourceId: "sub-999",
    eventQualifier: "round-2",
  });
  assert.equal(
    keyWithQualifier,
    `${VALID_USER_UUID}:EDITORIAL_DECISION:sub-999:round-2`,
  );

  // First creation
  const first = await createNotification(
    {
      userId: VALID_USER_UUID,
      type: "MANUSCRIPT_SUBMITTED",
      title: "First Attempt",
      message: "Should create notification.",
      actionUrl: "/admin/submissions/sub-999",
      idempotencyKey: key1,
    },
    db,
  );
  assert.equal(first.duplicate, false);

  // Second identical creation attempt with same key
  const second = await createNotification(
    {
      userId: VALID_USER_UUID,
      type: "MANUSCRIPT_SUBMITTED",
      title: "First Attempt (Duplicate)",
      message: "Should NOT create duplicate.",
      actionUrl: "/admin/submissions/sub-999",
      idempotencyKey: key1,
    },
    db,
  );
  assert.equal(second.duplicate, true);
  assert.equal(second.notification.id, first.notification.id);

  // Verify only 1 record exists
  const unreadCount = await getUnreadCount(VALID_USER_UUID, db);
  assert.equal(unreadCount, 1);
});

test("Recipient Resolution: Platform-wide Super Admins", async () => {
  const db = createInMemoryNotificationDb();
  db._store.userGlobalRoles.push(
    { userId: VALID_USER_UUID, role: "SUPER_ADMIN" },
    { userId: SECOND_USER_UUID, role: "SUPER_ADMIN" },
    { userId: THIRD_USER_UUID, role: "AUTHOR" },
  );

  const superAdmins = await resolveSuperAdminRecipients(db);
  assert.equal(superAdmins.length, 2);
  assert.ok(superAdmins.includes(VALID_USER_UUID));
  assert.ok(superAdmins.includes(SECOND_USER_UUID));
  assert.ok(!superAdmins.includes(THIRD_USER_UUID));
});

test("Recipient Resolution: Journal-scoped Administrators", async () => {
  const db = createInMemoryNotificationDb();
  db._store.journalRoleAssignments.push(
    { userId: VALID_USER_UUID, journalId: "njcp", role: "JOURNAL_ADMIN" },
    { userId: SECOND_USER_UUID, journalId: "ajsbs", role: "JOURNAL_ADMIN" },
    { userId: THIRD_USER_UUID, journalId: "njcp", role: "EDITOR" },
  );

  const njcpAdmins = await resolveJournalAdminRecipients("njcp", db);
  assert.deepEqual(njcpAdmins, [VALID_USER_UUID]);

  const ajsbsAdmins = await resolveJournalAdminRecipients("ajsbs", db);
  assert.deepEqual(ajsbsAdmins, [SECOND_USER_UUID]);

  const nonExistent = await resolveJournalAdminRecipients("unknown", db);
  assert.deepEqual(nonExistent, []);
});

test("Recipient Resolution: Manuscript Authors and Assigned Editors", async () => {
  const db = createInMemoryNotificationDb();
  const submissionId = "sub-test-123";

  db._store.submissions.set(submissionId, {
    id: submissionId,
    ownerId: VALID_USER_UUID,
    journalId: "njcp",
  });

  db._store.reviewAssignments.push(
    {
      editorId: SECOND_USER_UUID,
      status: "ASSIGNED",
      reviewRound: { submissionId },
    },
    {
      editorId: THIRD_USER_UUID,
      status: "DECLINED", // Declined should be excluded
      reviewRound: { submissionId },
    },
  );

  // Author + assigned active editors
  const recipients = await resolveManuscriptRecipients(
    submissionId,
    { includeAuthor: true, includeAssignedEditors: true },
    db,
  );
  assert.equal(recipients.length, 2);
  assert.ok(recipients.includes(VALID_USER_UUID));
  assert.ok(recipients.includes(SECOND_USER_UUID));
  assert.ok(!recipients.includes(THIRD_USER_UUID));
});

test("Recipient Resolution: Author-Operator Request Communication", async () => {
  const db = createInMemoryNotificationDb();
  const requestId = "req-test-456";

  db._store.submissionRequests.set(requestId, {
    id: requestId,
    authorId: VALID_USER_UUID,
    journalId: "njcp",
  });

  db._store.userGlobalRoles.push({
    userId: SECOND_USER_UUID,
    role: "SUPER_ADMIN",
  });
  db._store.journalRoleAssignments.push({
    userId: THIRD_USER_UUID,
    journalId: "njcp",
    role: "JOURNAL_ADMIN",
  });

  const recipients = await resolveRequestRecipients(requestId, {}, db);
  // Expect Author (VALID_USER_UUID) + Super Admin (SECOND_USER_UUID) + Journal Admin (THIRD_USER_UUID)
  assert.equal(recipients.length, 3);
  assert.ok(recipients.includes(VALID_USER_UUID));
  assert.ok(recipients.includes(SECOND_USER_UUID));
  assert.ok(recipients.includes(THIRD_USER_UUID));
});

test("Unread Count & Read Status Transitions: Mark single and mark all", async () => {
  const db = createInMemoryNotificationDb();

  // Create 3 unread notifications for VALID_USER_UUID
  const n1 = await createNotification(
    {
      userId: VALID_USER_UUID,
      type: "MANUSCRIPT_SUBMITTED",
      title: "Notif 1",
      message: "Msg 1",
      actionUrl: "/admin/submissions",
    },
    db,
  );

  const n2 = await createNotification(
    {
      userId: VALID_USER_UUID,
      type: "TRACKING_ASSIGNED",
      title: "Notif 2",
      message: "Msg 2",
      actionUrl: "/author/requests",
    },
    db,
  );

  const n3 = await createNotification(
    {
      userId: VALID_USER_UUID,
      type: "CORRECTION_REQUESTED",
      title: "Notif 3",
      message: "Msg 3",
      actionUrl: "/author/submissions",
    },
    db,
  );
  assert.ok(n3.notification.id.startsWith("notif-"));

  // Create 1 notification for SECOND_USER_UUID
  await createNotification(
    {
      userId: SECOND_USER_UUID,
      type: "ARTICLE_PUBLISHED",
      title: "Notif Other",
      message: "Msg Other",
      actionUrl: "/articles",
    },
    db,
  );

  // Check initial counts
  assert.equal(await getUnreadCount(VALID_USER_UUID, db), 3);
  assert.equal(await getUnreadCount(SECOND_USER_UUID, db), 1);

  // 1. Mark single notification as read
  const marked1 = await markNotificationAsRead(
    n1.notification.id,
    VALID_USER_UUID,
    db,
  );
  assert.equal(marked1?.isRead, true);
  assert.ok(marked1?.readAt instanceof Date);
  assert.equal(await getUnreadCount(VALID_USER_UUID, db), 2);

  // 2. Ownership enforcement: SECOND_USER_UUID cannot mark VALID_USER_UUID's notification
  const crossUserMark = await markNotificationAsRead(
    n2.notification.id,
    SECOND_USER_UUID,
    db,
  );
  assert.equal(crossUserMark, null);
  assert.equal(await getUnreadCount(VALID_USER_UUID, db), 2); // Unchanged

  // 3. Mark all as read for VALID_USER_UUID
  const markAllResult = await markAllNotificationsAsRead(VALID_USER_UUID, db);
  assert.equal(markAllResult.count, 2);
  assert.equal(await getUnreadCount(VALID_USER_UUID, db), 0);

  // SECOND_USER_UUID's unread notification remains untouched
  assert.equal(await getUnreadCount(SECOND_USER_UUID, db), 1);
});

test("List Notifications: Pagination and unread filtering", async () => {
  const db = createInMemoryNotificationDb();

  // Create 5 notifications
  for (let i = 1; i <= 5; i++) {
    await createNotification(
      {
        userId: VALID_USER_UUID,
        type: "INTERNAL_CHAT_MESSAGE",
        title: `Message ${i}`,
        message: `Body ${i}`,
        actionUrl: `/admin/chat/${i}`,
      },
      db,
    );
  }

  // Page 1, pageSize 2
  const page1 = await listNotifications(
    VALID_USER_UUID,
    { page: 1, pageSize: 2 },
    db,
  );
  assert.equal(page1.notifications.length, 2);
  assert.equal(page1.totalCount, 5);
  assert.equal(page1.unreadCount, 5);
  assert.equal(page1.totalPages, 3);
  assert.equal(page1.hasMore, true);

  // Mark 1 as read
  await markNotificationAsRead(page1.notifications[0].id, VALID_USER_UUID, db);

  // Filter unread only
  const unreadOnly = await listNotifications(
    VALID_USER_UUID,
    { filter: "unread", page: 1, pageSize: 10 },
    db,
  );
  assert.equal(unreadOnly.notifications.length, 4);
  assert.equal(unreadOnly.totalCount, 4);
  assert.equal(unreadOnly.unreadCount, 4);
});
