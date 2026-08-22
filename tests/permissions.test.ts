import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessApplicationArea,
  getRoleLandingPage,
  hasJournalRole,
} from "@/lib/auth/permissions";

test("journal roles remain scoped to their assigned journal", () => {
  const editor = {
    globalRoles: [],
    journalRoles: [{ journalId: "journal-a", role: "EDITOR" as const }],
  };

  assert.equal(hasJournalRole(editor, "journal-a", "EDITOR"), true);
  assert.equal(hasJournalRole(editor, "journal-b", "EDITOR"), false);
});

test("a journal administrator does not receive global administration", () => {
  const administrator = {
    globalRoles: [],
    journalRoles: [{ journalId: "journal-a", role: "JOURNAL_ADMIN" as const }],
  };

  assert.equal(canAccessApplicationArea(administrator, "admin"), true);
  assert.equal(canAccessApplicationArea(administrator, "editor"), false);
  assert.equal(getRoleLandingPage(administrator), "/admin");
});

test("a super administrator may enter every protected application area", () => {
  const superAdministrator = {
    globalRoles: [{ role: "SUPER_ADMIN" as const }],
    journalRoles: [],
  };

  assert.equal(canAccessApplicationArea(superAdministrator, "admin"), true);
  assert.equal(canAccessApplicationArea(superAdministrator, "editor"), true);
  assert.equal(canAccessApplicationArea(superAdministrator, "author"), true);
});

test("an author has no editor or administrator access", () => {
  const author = {
    globalRoles: [{ role: "AUTHOR" as const }],
    journalRoles: [],
  };

  assert.equal(canAccessApplicationArea(author, "author"), true);
  assert.equal(canAccessApplicationArea(author, "editor"), false);
  assert.equal(canAccessApplicationArea(author, "admin"), false);
});
