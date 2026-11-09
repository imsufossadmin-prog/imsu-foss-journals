import assert from "node:assert/strict";
import test from "node:test";

import {
  createReviewerApplication,
  deleteReviewerApplication,
  formatAcademicName,
  getReviewerApplicationForUser,
  getReviewerApplications,
  updateReviewerApplicationStatus,
} from "@/lib/editorial/reviewer-applications-store";
import type {
  NotificationRecord,
  NotificationType,
} from "@/lib/notifications/types";

const superAdminActor = {
  id: "admin-super",
  email: "superadmin@imsu-foss.ng",
  globalRoles: [{ role: "SUPER_ADMIN" as const }],
  journalRoles: [],
};

const psychologyAdminActor = {
  id: "admin-psych",
  email: "psychadmin@imsu-foss.ng",
  globalRoles: [{ role: "AUTHOR" as const }],
  journalRoles: [
    {
      journalId: "njcp",
      role: "JOURNAL_ADMIN" as const,
      journal: { slug: "njcp" },
    },
  ],
};

const authorActor = {
  id: "author-1",
  email: "author@gmail.com",
  globalRoles: [{ role: "AUTHOR" as const }],
  journalRoles: [],
};

const TEST_SUPER_ADMIN_UUID = "11111111-1111-4111-8111-111111111111";

/**
 * Isolated in-memory notification client so running `npm test` never pollutes
 * the production/staging Notification table with test reviewer applications.
 */
function createIsolatedNotifyClient() {
  const notifications: NotificationRecord[] = [];
  let seq = 1;
  return {
    notifications,
    userGlobalRole: {
      findMany: async () => [{ userId: TEST_SUPER_ADMIN_UUID }],
    },
    journalRoleAssignment: {
      findMany: async () => [],
    },
    journal: {
      findFirst: async () => ({ id: "j-test" }),
    },
    notification: {
      findUnique: async ({ where }: { where: { idempotencyKey?: string } }) =>
        notifications.find((n) => n.idempotencyKey === where.idempotencyKey) ??
        null,
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
        const rec: NotificationRecord = {
          id: `isolated-notif-${seq++}`,
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
        notifications.push(rec);
        return rec;
      },
    },
  };
}

test("Reviewer Applications: Validation and Application Creation", async () => {
  const notifyClient = createIsolatedNotifyClient();

  // 1. Missing required fields fails validation
  const invalidRes = await createReviewerApplication(
    {
      fullName: "",
      academicTitle: "Dr.",
      email: "",
      phone: "",
      affiliation: "",
      academicRank: "",
      specializationKeywords: "",
      targetJournal: "njcp",
      statement: "",
    },
    { notifyClient },
  );
  assert.equal(invalidRes.success, false);
  assert.ok(invalidRes.error?.includes("required"));
  assert.equal(notifyClient.notifications.length, 0);

  // 2. Valid creation generates a formatted tracking code and isolated notification
  const validRes = await createReviewerApplication(
    {
      fullName: "Dr. Chioma Okonkwo",
      academicTitle: "Dr.",
      email: "chioma.okonkwo@imsu.edu.ng",
      phone: "+2348012345678",
      affiliation: "Imo State University, Department of Psychology",
      academicRank: "Senior Lecturer",
      specializationKeywords:
        "Clinical Psychology, Cognitive Behavioural Therapy",
      targetJournal: "njcp",
      profileUrl: "https://orcid.org/0000-0002-1825-0097",
      statement:
        "Interested in contributing to peer review for behavioral health manuscripts.",
    },
    { notifyClient },
  );

  try {
    assert.equal(validRes.success, true);
    assert.ok(validRes.trackingCode?.startsWith("REV-NJCP-"));
    assert.ok(validRes.application);
    assert.equal(validRes.application.status, "PENDING");
    assert.equal(validRes.application.targetJournal, "njcp");

    // Verify notification was captured in isolated notifyClient with official journal short name
    assert.equal(notifyClient.notifications.length, 1);
    assert.equal(
      notifyClient.notifications[0].type,
      "REVIEWER_APPLICATION_RECEIVED",
    );
    assert.equal(
      notifyClient.notifications[0].resourceId,
      validRes.application.id,
    );
    assert.ok(notifyClient.notifications[0].message.includes("for NJCP."));
  } finally {
    if (validRes.application?.id) {
      await deleteReviewerApplication({
        applicationId: validRes.application.id,
        actor: superAdminActor,
      });
    }
  }
});

test("Reviewer Applications: List and Scoped Retrieval", async () => {
  const notifyClient = createIsolatedNotifyClient();
  const created = await createReviewerApplication(
    {
      fullName: "Dr. Scoped Reviewer",
      academicTitle: "Dr.",
      email: "scoped.reviewer@imsu.edu.ng",
      phone: "+2348000001111",
      affiliation: "Imo State University",
      academicRank: "Lecturer I",
      specializationKeywords: "Psychometrics",
      targetJournal: "njcp",
      statement: "Scoped retrieval test.",
    },
    { notifyClient },
  );

  try {
    assert.equal(created.success, true);
    const allApps = await getReviewerApplications(superAdminActor);
    assert.ok(Array.isArray(allApps));
    assert.ok(allApps.length > 0);

    // Filter by journal
    const psychApps = await getReviewerApplications(superAdminActor, {
      journalSlug: "njcp",
    });
    assert.ok(
      psychApps.every(
        (a) => a.targetJournal === "njcp" || a.targetJournal === "ALL",
      ),
    );
  } finally {
    if (created.application?.id) {
      await deleteReviewerApplication({
        applicationId: created.application.id,
        actor: superAdminActor,
      });
    }
  }
});

test("Reviewer Applications: Status Transition and Department Authorization", async () => {
  const notifyClient = createIsolatedNotifyClient();

  // Create an application specifically for NJCP
  const res = await createReviewerApplication(
    {
      fullName: "Prof. Emeka Obi",
      academicTitle: "Prof.",
      email: "emeka.obi@example.com",
      phone: "+2348099887766",
      affiliation: "University of Nigeria, Nsukka",
      academicRank: "Professor",
      specializationKeywords: "Social Psychology, Organizational Behavior",
      targetJournal: "njcp",
      statement: "Willing to review manuscripts on organizational behavior.",
    },
    { notifyClient },
  );
  assert.equal(res.success, true);
  const appId = res.application!.id;
  let ajsbsAppId: string | null = null;

  try {
    // 1. Author cannot approve or decline
    const authorActionRes = await updateReviewerApplicationStatus({
      applicationId: appId,
      status: "APPROVED",
      actor: authorActor,
      notifyClient,
    });
    assert.equal(authorActionRes.success, false);
    assert.ok(authorActionRes.error?.includes("Unauthorized"));

    // 2. Psychology admin can approve NJCP application
    const psychApproveRes = await updateReviewerApplicationStatus({
      applicationId: appId,
      status: "APPROVED",
      actor: psychologyAdminActor,
      notifyClient,
    });
    assert.equal(psychApproveRes.success, true);

    // 3. Verify status updated
    const updatedApps = await getReviewerApplications(superAdminActor);
    const updatedApp = updatedApps.find((a) => a.id === appId);
    assert.ok(updatedApp);
    assert.equal(updatedApp.status, "APPROVED");

    // 4. Psychology admin cannot delete an AJSBS application
    const ajsbsRes = await createReviewerApplication(
      {
        fullName: "Dr. AJSBS Reviewer",
        academicTitle: "Dr.",
        email: "ajsbs.reviewer@example.com",
        phone: "+2348011112222",
        affiliation: "Faculty of Social Sciences",
        academicRank: "Reader",
        specializationKeywords: "Social Sciences",
        targetJournal: "ajsbs",
        statement: "Reviewing for AJSBS flagship.",
      },
      { notifyClient },
    );
    assert.equal(ajsbsRes.success, true);
    ajsbsAppId = ajsbsRes.application!.id;

    const psychDeleteDenied = await deleteReviewerApplication({
      applicationId: ajsbsAppId,
      actor: psychologyAdminActor,
    });
    assert.equal(psychDeleteDenied.success, false);
    assert.ok(psychDeleteDenied.error?.includes("Unauthorized"));

    // 5. Super Admin can delete
    const superDeleteAllowed = await deleteReviewerApplication({
      applicationId: ajsbsAppId,
      actor: superAdminActor,
    });
    assert.equal(superDeleteAllowed.success, true);
    ajsbsAppId = null;
  } finally {
    if (ajsbsAppId) {
      await deleteReviewerApplication({
        applicationId: ajsbsAppId,
        actor: superAdminActor,
      });
    }
    await deleteReviewerApplication({
      applicationId: appId,
      actor: superAdminActor,
    });
  }
});

test("Reviewer Applications: Authenticated submission preserves applicantUserId", async () => {
  const notifyClient = createIsolatedNotifyClient();
  const validUserUuid = "a0000000-0000-0000-0000-000000001234";
  const authRes = await createReviewerApplication(
    {
      fullName: "Dr. Authenticated Scholar",
      academicTitle: "Dr.",
      email: "auth.scholar@example.com",
      phone: "+2348055555555",
      affiliation: "IMSU Department of Psychology",
      academicRank: "Senior Lecturer",
      specializationKeywords: "Developmental Psychology",
      targetJournal: "njcp",
      statement: "Experienced reviewer.",
      applicantUserId: validUserUuid,
    },
    { notifyClient },
  );

  try {
    assert.equal(authRes.success, true);
    assert.ok(authRes.application);
    assert.equal(authRes.application.applicantUserId, validUserUuid);
    assert.equal(authRes.application.status, "PENDING");

    // Lookup for user by userId
    const foundByUserId = await getReviewerApplicationForUser({
      id: validUserUuid,
    });
    assert.ok(foundByUserId);
    assert.equal(foundByUserId.id, authRes.application.id);

    // Lookup for user by email
    const foundByEmail = await getReviewerApplicationForUser({
      email: "auth.scholar@example.com",
    });
    assert.ok(foundByEmail);
    assert.equal(foundByEmail.id, authRes.application.id);
  } finally {
    if (authRes.application?.id) {
      await deleteReviewerApplication({
        applicationId: authRes.application.id,
        actor: superAdminActor,
      });
    }
  }
});

test("Reviewer Applications: formatAcademicName prevents duplicate titles", () => {
  // Title already present in fullName
  assert.equal(
    formatAcademicName("Prof.", "Prof. Emeka Obi"),
    "Prof. Emeka Obi",
  );
  assert.equal(formatAcademicName("Prof.", "Prof Emeka Obi"), "Prof Emeka Obi");
  assert.equal(
    formatAcademicName("Dr.", "Dr. Chioma Okonkwo"),
    "Dr. Chioma Okonkwo",
  );
  assert.equal(
    formatAcademicName("Dr.", "Dr Chioma Okonkwo"),
    "Dr Chioma Okonkwo",
  );
  assert.equal(
    formatAcademicName("Assoc. Prof.", "Assoc. Prof. Nkwam C. Uwaoma"),
    "Assoc. Prof. Nkwam C. Uwaoma",
  );

  // Title not present in fullName
  assert.equal(formatAcademicName("Prof.", "Emeka Obi"), "Prof. Emeka Obi");
  assert.equal(
    formatAcademicName("Dr.", "Chioma Okonkwo"),
    "Dr. Chioma Okonkwo",
  );
  assert.equal(formatAcademicName("", "Chioma Okonkwo"), "Chioma Okonkwo");
  assert.equal(formatAcademicName("Dr.", ""), "");
});
