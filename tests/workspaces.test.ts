import assert from "node:assert/strict";
import test from "node:test";

import {
  getAvailableWorkspaces,
  getJournalWorkspaces,
  getPostLoginDestination,
  type WorkspaceJournal,
  type WorkspaceSubject,
} from "@/lib/auth/workspaces";

const journalA: WorkspaceJournal = {
  id: "journal-a",
  slug: "social-sciences-review",
  name: "IMSU Journal of Social Sciences",
  shortName: "IJSS",
  isActive: true,
  department: {
    id: "department-a",
    slug: "psychology",
    name: "Psychology",
    isActive: true,
  },
};

const journalB: WorkspaceJournal = {
  id: "journal-b",
  slug: "policy-studies",
  name: "Journal of Policy Studies",
  shortName: "JPS",
  isActive: true,
  department: {
    id: "department-b",
    slug: "sociology",
    name: "Sociology",
    isActive: true,
  },
};

function subject(overrides: Partial<WorkspaceSubject> = {}): WorkspaceSubject {
  return {
    globalRoles: [],
    journalRoles: [],
    ...overrides,
  };
}

test("a user with one meaningful workspace is sent there directly", () => {
  assert.equal(
    getPostLoginDestination(
      subject({ globalRoles: [{ role: "SUPER_ADMIN" }] }),
    ),
    "/admin",
  );

  assert.equal(
    getPostLoginDestination(subject({ globalRoles: [{ role: "AUTHOR" }] })),
    "/author",
  );

  assert.equal(
    getPostLoginDestination(
      subject({
        journalRoles: [
          { journalId: journalA.id, role: "EDITOR", journal: journalA },
        ],
      }),
    ),
    "/editor/social-sciences-review",
  );
});

test("editors and staff users resolve directly to their operational workspace", () => {
  const user = subject({
    globalRoles: [{ role: "AUTHOR" }],
    journalRoles: [
      { journalId: journalA.id, role: "EDITOR", journal: journalA },
    ],
  });

  assert.equal(getPostLoginDestination(user), "/editor/social-sciences-review");
  assert.deepEqual(
    getAvailableWorkspaces(user).map(({ id }) => id),
    ["editor:journal-a"],
  );
});

test("roles in different journals remain distinct contexts", () => {
  const user = subject({
    journalRoles: [
      {
        journalId: journalB.id,
        role: "JOURNAL_ADMIN",
        journal: journalB,
      },
      { journalId: journalA.id, role: "EDITOR", journal: journalA },
    ],
  });

  assert.deepEqual(
    getAvailableWorkspaces(user).map(({ href }) => href),
    ["/admin/policy-studies", "/editor/social-sciences-review"],
  );
});

test("inactive journals never become available workspaces", () => {
  const inactiveJournal = { ...journalA, isActive: false };
  const user = subject({
    journalRoles: [
      {
        journalId: inactiveJournal.id,
        role: "JOURNAL_ADMIN",
        journal: inactiveJournal,
      },
    ],
  });

  assert.deepEqual(getAvailableWorkspaces(user), []);
  assert.equal(getPostLoginDestination(user), "/unauthorized?reason=workspace");
});

test("journal switchers show only contexts for the active role", () => {
  const user = subject({
    globalRoles: [{ role: "AUTHOR" }],
    journalRoles: [
      { journalId: journalA.id, role: "EDITOR", journal: journalA },
      { journalId: journalB.id, role: "EDITOR", journal: journalB },
      {
        journalId: journalB.id,
        role: "JOURNAL_ADMIN",
        journal: journalB,
      },
    ],
  });

  assert.deepEqual(
    getJournalWorkspaces(user, "EDITOR").map(({ href }) => href),
    ["/editor/social-sciences-review", "/editor/policy-studies"],
  );
  assert.deepEqual(
    getJournalWorkspaces(user, "JOURNAL_ADMIN").map(({ href }) => href),
    ["/admin/policy-studies"],
  );
});
