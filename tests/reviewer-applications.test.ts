import assert from "node:assert/strict";
import test from "node:test";

import {
  createReviewerApplication,
  deleteReviewerApplication,
  formatAcademicName,
  getReviewerApplicationForUser,
  getReviewerApplications,
  resetReviewerApplications,
  updateReviewerApplicationStatus,
} from "@/lib/editorial/reviewer-applications-store";

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

test("Reviewer Applications: Validation and Application Creation", async () => {
  resetReviewerApplications();
  // 1. Missing required fields fails validation
  const invalidRes = await createReviewerApplication({
    fullName: "",
    academicTitle: "Dr.",
    email: "",
    phone: "",
    affiliation: "",
    academicRank: "",
    specializationKeywords: "",
    targetJournal: "njcp",
    statement: "",
  });
  assert.equal(invalidRes.success, false);
  assert.ok(invalidRes.error?.includes("required"));

  // 2. Valid creation generates a formatted tracking code
  const validRes = await createReviewerApplication({
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
  });

  assert.equal(validRes.success, true);
  assert.ok(validRes.trackingCode?.startsWith("REV-NJCP-"));
  assert.ok(validRes.application);
  assert.equal(validRes.application.status, "PENDING");
  assert.equal(validRes.application.targetJournal, "njcp");
});

test("Reviewer Applications: List and Scoped Retrieval", async () => {
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
});

test("Reviewer Applications: Status Transition and Department Authorization", async () => {
  // Create an application specifically for NJCP
  const res = await createReviewerApplication({
    fullName: "Prof. Emeka Obi",
    academicTitle: "Prof.",
    email: "emeka.obi@example.com",
    phone: "+2348099887766",
    affiliation: "University of Nigeria, Nsukka",
    academicRank: "Professor",
    specializationKeywords: "Social Psychology, Organizational Behavior",
    targetJournal: "njcp",
    statement: "Willing to review manuscripts on organizational behavior.",
  });
  assert.equal(res.success, true);
  const appId = res.application!.id;

  // 1. Author cannot approve or decline
  const authorActionRes = await updateReviewerApplicationStatus({
    applicationId: appId,
    status: "APPROVED",
    actor: authorActor,
  });
  assert.equal(authorActionRes.success, false);
  assert.ok(authorActionRes.error?.includes("Unauthorized"));

  // 2. Psychology admin can approve NJCP application
  const psychApproveRes = await updateReviewerApplicationStatus({
    applicationId: appId,
    status: "APPROVED",
    actor: psychologyAdminActor,
  });
  assert.equal(psychApproveRes.success, true);

  // 3. Verify status updated
  const updatedApps = await getReviewerApplications(superAdminActor);
  const updatedApp = updatedApps.find((a) => a.id === appId);
  assert.ok(updatedApp);
  assert.equal(updatedApp.status, "APPROVED");

  // 4. Psychology admin cannot delete an AJSBS application
  const ajsbsRes = await createReviewerApplication({
    fullName: "Dr. AJSBS Reviewer",
    academicTitle: "Dr.",
    email: "ajsbs.reviewer@example.com",
    phone: "+2348011112222",
    affiliation: "Faculty of Social Sciences",
    academicRank: "Reader",
    specializationKeywords: "Social Sciences",
    targetJournal: "ajsbs",
    statement: "Reviewing for AJSBS flagship.",
  });
  assert.equal(ajsbsRes.success, true);
  const ajsbsAppId = ajsbsRes.application!.id;

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
});

test("Reviewer Applications: Authenticated submission preserves applicantUserId", async () => {
  const authRes = await createReviewerApplication({
    fullName: "Dr. Authenticated Scholar",
    academicTitle: "Dr.",
    email: "auth.scholar@example.com",
    phone: "+2348055555555",
    affiliation: "IMSU Department of Psychology",
    academicRank: "Senior Lecturer",
    specializationKeywords: "Developmental Psychology",
    targetJournal: "njcp",
    statement: "Experienced reviewer.",
    applicantUserId: "user-auth-uuid-1234",
  });

  assert.equal(authRes.success, true);
  assert.ok(authRes.application);
  assert.equal(authRes.application.applicantUserId, "user-auth-uuid-1234");
  assert.equal(authRes.application.status, "PENDING");

  // Lookup for user by userId
  const foundByUserId = await getReviewerApplicationForUser({
    id: "user-auth-uuid-1234",
  });
  assert.ok(foundByUserId);
  assert.equal(foundByUserId.id, authRes.application.id);

  // Lookup for user by email
  const foundByEmail = await getReviewerApplicationForUser({
    email: "auth.scholar@example.com",
  });
  assert.ok(foundByEmail);
  assert.equal(foundByEmail.id, authRes.application.id);
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
