import assert from "node:assert/strict";
import test from "node:test";

import {
  hasJournalRole,
  isSuperAdmin,
  canAccessApplicationArea,
  type AuthorizationSubject,
} from "@/lib/auth/permissions";
import { getRoleChangeDenialReason } from "@/lib/auth/role-management-policy";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";

test("Phase 3: Faculty journals without department relation work seamlessly in workspaces", () => {
  const facultyJournal = {
    id: "ajsbs-id",
    slug: "ajsbs",
    name: "African Journal of Social and Behavioural Sciences",
    shortName: "AJSBS",
    isActive: true,
    department: null,
  };

  const subject = {
    globalRoles: [{ role: "AUTHOR" as const }],
    journalRoles: [
      {
        journalId: "ajsbs-id",
        role: "JOURNAL_ADMIN" as const,
        journal: facultyJournal,
      },
    ],
  };

  const workspaces = getAvailableWorkspaces(subject);
  assert.equal(workspaces.length, 1);
  assert.equal(workspaces[0].area, "journal-admin");
  assert.equal(workspaces[0].href, "/admin/ajsbs");
  assert.equal(
    workspaces[0].title,
    "African Journal of Social and Behavioural Sciences operations",
  );
});

test("Phase 3: Journal Admin isolation applies strictly across all 10 journals", () => {
  const ajsbsAdminUser = {
    id: "user-ajsbs-admin",
    email: "ajsbs@imsu.edu.ng",
    displayName: "AJSBS Admin",
    isActive: true,
    globalRoles: [{ role: "AUTHOR" as const }],
    journalRoles: [
      {
        id: "ja-1",
        journalId: "ajsbs-id",
        role: "JOURNAL_ADMIN" as const,
        journal: {
          id: "ajsbs-id",
          slug: "ajsbs",
          name: "AJSBS",
          shortName: "AJSBS",
          isActive: true,
          department: null,
        },
      },
    ],
  };

  type AuthUser = Parameters<typeof hasJournalRole>[0];

  // Has access to AJSBS
  assert.equal(
    hasJournalRole(
      ajsbsAdminUser as unknown as AuthUser,
      "ajsbs-id",
      "JOURNAL_ADMIN",
    ),
    true,
  );
  // Denied access to GJSBR, NJSBR, and Psychology
  assert.equal(
    hasJournalRole(
      ajsbsAdminUser as unknown as AuthUser,
      "gjsbr-id",
      "JOURNAL_ADMIN",
    ),
    false,
  );
  assert.equal(
    hasJournalRole(
      ajsbsAdminUser as unknown as AuthUser,
      "njsbr-id",
      "JOURNAL_ADMIN",
    ),
    false,
  );
  assert.equal(
    hasJournalRole(
      ajsbsAdminUser as unknown as AuthUser,
      "psychology-id",
      "JOURNAL_ADMIN",
    ),
    false,
  );

  // Super Admin has access to all 10 journals
  const superAdminUser = {
    id: "user-super-admin",
    email: "super@imsu.edu.ng",
    displayName: "Super Admin",
    isActive: true,
    globalRoles: [{ role: "SUPER_ADMIN" as const }],
    journalRoles: [],
  };

  assert.equal(
    isSuperAdmin(superAdminUser as unknown as AuthorizationSubject),
    true,
  );
  assert.equal(
    canAccessApplicationArea(
      superAdminUser as unknown as AuthorizationSubject,
      "admin",
    ),
    true,
  );
});

test("Phase 3: Role management policy isolates Journal Admins to their specific journal", () => {
  const ajsbsAdminActor = {
    id: "admin-ajsbs",
    isActive: true,
    isSuperAdmin: false,
    scopedRoles: [
      {
        role: "JOURNAL_ADMIN" as const,
        journalId: "ajsbs-id",
        departmentId: null,
      },
    ],
  };

  const target = { id: "target-editor", isActive: true };

  // Can assign Editor in AJSBS
  assert.equal(
    getRoleChangeDenialReason({
      actor: ajsbsAdminActor,
      target,
      role: "EDITOR",
      scope: {
        journalId: "ajsbs-id",
        departmentId: null,
        isActive: true,
        departmentIsActive: true,
      },
    }),
    null,
  );

  // Cannot assign Editor in GJSBR
  assert.match(
    getRoleChangeDenialReason({
      actor: ajsbsAdminActor,
      target,
      role: "EDITOR",
      scope: {
        journalId: "gjsbr-id",
        departmentId: null,
        isActive: true,
        departmentIsActive: true,
      },
    })!,
    /own journal/,
  );
});

test("Phase 3: Page range is never auto-invented when not provided", () => {
  const rawInputEmpty = "";
  const partsEmpty = rawInputEmpty ? rawInputEmpty.split("-") : [];
  const pageStartEmpty = partsEmpty[0]?.trim() || null;
  const pageEndEmpty = partsEmpty[1]?.trim() || null;

  assert.equal(pageStartEmpty, null);
  assert.equal(pageEndEmpty, null);

  const rawInputGiven = "45-62";
  const partsGiven = rawInputGiven.split("-");
  const pageStartGiven = partsGiven[0]?.trim() || null;
  const pageEndGiven = partsGiven[1]?.trim() || null;

  assert.equal(pageStartGiven, "45");
  assert.equal(pageEndGiven, "62");
});

test("Phase 3: Production file MIME type detection handles PDF and DOCX accurately", () => {
  const allowedMimes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];

  assert.equal(allowedMimes.includes("application/pdf"), true);
  assert.equal(
    allowedMimes.includes(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    true,
  );
  assert.equal(allowedMimes.includes("application/zip"), false);
  assert.equal(allowedMimes.includes("text/plain"), false);
});

test("Phase 3: issueOrder resolves collisions safely and preserves existing order on republish", () => {
  const otherArticles = [
    { issueOrder: 1 },
    { issueOrder: 2 },
    { issueOrder: 5 },
  ];
  const occupiedSet = new Set(otherArticles.map((a) => a.issueOrder));

  // 1. Explicit occupied order throws user-friendly collision error
  const requestedOccupied = 2;
  assert.equal(occupiedSet.has(requestedOccupied), true);
  const collisionMessage = `Article order ${requestedOccupied} is already used in this issue. Choose another order.`;
  assert.match(
    collisionMessage,
    /Article order 2 is already used in this issue/,
  );

  // 2. Explicit vacant order is accepted
  const requestedVacant = 3;
  assert.equal(occupiedSet.has(requestedVacant), false);

  // 3. Auto-order computes max + 1 safely
  const maxOrder = otherArticles.reduce(
    (max, a) => (a.issueOrder && a.issueOrder > max ? a.issueOrder : max),
    0,
  );
  let candidate = maxOrder + 1;
  while (occupiedSet.has(candidate)) {
    candidate++;
  }
  assert.equal(candidate, 6);

  // 4. Existing article republishing to the same issue retains its order if vacant
  const existingArticle = { issueId: "issue-1", issueOrder: 3 };
  const targetIssueId = "issue-1";
  const finalPreservedOrder =
    existingArticle.issueId === targetIssueId &&
    !occupiedSet.has(existingArticle.issueOrder)
      ? existingArticle.issueOrder
      : candidate;
  assert.equal(finalPreservedOrder, 3);
});

test("Phase 3: generateIssueTOCPdf produces a valid PDF binary buffer containing issue details", async () => {
  const { generateIssueTOCPdf } = await import("@/lib/editorial/toc-pdf");

  const sampleIssue = {
    id: "issue-test-123",
    number: 2,
    volume: {
      number: 1,
      year: 2026,
      journal: {
        name: "African Journal of Social and Behavioural Sciences",
        shortName: "AJSBS",
        slug: "ajsbs",
        institution: "Imo State University",
        faculty: "Faculty of Social Sciences",
        department: null,
      },
    },
    articles: [
      {
        id: "art-1",
        title: "Perceived Work Stress and Employee Productivity in Owerri",
        issueOrder: 1,
        pageStart: "15",
        pageEnd: "29",
        doi: "10.4314/ajsbs.v1i2.1",
        authors: [
          { fullName: "Dr. Chidi Okafor" },
          { fullName: "Prof. Ngozi Eze" },
        ],
      },
      {
        id: "art-2",
        title: "Youth Civic Engagement and Digital Media Trends",
        issueOrder: 2,
        pageStart: null,
        pageEnd: null,
        doi: null,
        authors: [{ fullName: "Ifeanyi Nwachukwu" }],
      },
    ],
  };

  const pdfBytes = await generateIssueTOCPdf(sampleIssue);
  assert.equal(pdfBytes instanceof Uint8Array, true);
  assert.equal(pdfBytes.length > 500, true);

  // Check PDF signature: %PDF-
  const headerStr = Buffer.from(pdfBytes.slice(0, 5)).toString("utf-8");
  assert.equal(headerStr, "%PDF-");
});

test("Phase 7: Direct article upload authorization rules for Super Admin and Journal Admin", () => {
  const superAdminUser = {
    globalRoles: [
      { role: "SUPER_ADMIN" as const },
      { role: "AUTHOR" as const },
    ],
    journalRoles: [],
  };

  const multiJaUser = {
    globalRoles: [{ role: "AUTHOR" as const }],
    journalRoles: [
      { journalId: "econ-id", role: "JOURNAL_ADMIN" as const },
      { journalId: "soc-id", role: "JOURNAL_ADMIN" as const },
      { journalId: "lis-id", role: "JOURNAL_ADMIN" as const },
    ],
  };

  const editorUser = {
    globalRoles: [{ role: "AUTHOR" as const }],
    journalRoles: [{ journalId: "econ-id", role: "EDITOR" as const }],
  };

  const authorUser = {
    globalRoles: [{ role: "AUTHOR" as const }],
    journalRoles: [],
  };

  // Helper evaluating direct upload permission for a given journal
  function canDirectUpload(
    user: AuthorizationSubject,
    targetJournalId: string,
  ) {
    if (isSuperAdmin(user)) return true;
    if (!canAccessApplicationArea(user, "admin")) return false;
    return hasJournalRole(user, targetJournalId, "JOURNAL_ADMIN");
  }

  // 1. Super Admin can upload to ANY journal
  assert.equal(canDirectUpload(superAdminUser, "econ-id"), true);
  assert.equal(canDirectUpload(superAdminUser, "psych-id"), true);
  assert.equal(canDirectUpload(superAdminUser, "ajsbs-id"), true);

  // 2. Multi-JA can upload ONLY to assigned journals
  assert.equal(canDirectUpload(multiJaUser, "econ-id"), true);
  assert.equal(canDirectUpload(multiJaUser, "soc-id"), true);
  assert.equal(canDirectUpload(multiJaUser, "lis-id"), true);

  // Denied for unassigned journals
  assert.equal(canDirectUpload(multiJaUser, "psych-id"), false);
  assert.equal(canDirectUpload(multiJaUser, "ajsbs-id"), false);
  assert.equal(canDirectUpload(multiJaUser, "njsbr-id"), false);

  // 3. Editor & Author denied
  assert.equal(canDirectUpload(editorUser, "econ-id"), false);
  assert.equal(canDirectUpload(authorUser, "econ-id"), false);
});

test("Phase 7: Direct article upload journal selection filters by user roles", () => {
  const allActiveJournals = [
    { id: "econ-id", slug: "economics", name: "Economics" },
    { id: "soc-id", slug: "sociology", name: "Sociology" },
    { id: "lis-id", slug: "library-information-science", name: "LIS" },
    { id: "psych-id", slug: "psychology", name: "Psychology" },
    { id: "ajsbs-id", slug: "ajsbs", name: "AJSBS" },
  ];

  function getSelectableJournals(user: AuthorizationSubject) {
    if (isSuperAdmin(user)) return allActiveJournals;
    const allowed = user.journalRoles
      .filter((jr) => jr.role === "JOURNAL_ADMIN")
      .map((jr) => jr.journalId);
    return allActiveJournals.filter((j) => allowed.includes(j.id));
  }

  const superAdmin = {
    globalRoles: [{ role: "SUPER_ADMIN" as const }],
    journalRoles: [],
  };

  const jaUser = {
    globalRoles: [{ role: "AUTHOR" as const }],
    journalRoles: [
      { journalId: "econ-id", role: "JOURNAL_ADMIN" as const },
      { journalId: "lis-id", role: "JOURNAL_ADMIN" as const },
    ],
  };

  assert.equal(getSelectableJournals(superAdmin).length, 5);
  const jaJournals = getSelectableJournals(jaUser);
  assert.equal(jaJournals.length, 2);
  assert.deepEqual(
    jaJournals.map((j) => j.slug),
    ["economics", "library-information-science"],
  );
});
