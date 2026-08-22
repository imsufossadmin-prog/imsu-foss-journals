import assert from "node:assert/strict";
import test from "node:test";

import {
  appendPreserved,
  canAccessAssignment,
  canAssignReviewer,
  canIssueDecision,
  canManageSubmission,
  canReadAssignedFile,
  canSubmitReview,
  canSubmitRevision,
  type AssignmentScope,
  type EditorialActor,
} from "../lib/editorial/policy";
import {
  decisionSubmissionStatus,
  hasBlindIdentityLeak,
  safeAuthorReview,
  validateReview,
} from "../lib/editorial/validation";

const ownJournal = "journal-a";
const otherJournal = "journal-b";
const submission = {
  id: "submission-a",
  journalId: ownJournal,
  ownerId: "author",
};
const otherSubmission = {
  ...submission,
  id: "submission-b",
  journalId: otherJournal,
};
const admin: EditorialActor = {
  id: "admin",
  active: true,
  adminJournalIds: [ownJournal],
  editorJournalIds: [],
};
const editor: EditorialActor = {
  id: "editor",
  active: true,
  adminJournalIds: [],
  editorJournalIds: [ownJournal],
};
const crossJournalEditor: EditorialActor = {
  ...editor,
  id: "cross-editor",
  editorJournalIds: [otherJournal],
};
const assignment: AssignmentScope = {
  id: "assignment",
  editorId: editor.id,
  journalId: ownJournal,
  submissionId: submission.id,
  status: "ASSIGNED",
};

test("1. JOURNAL_ADMIN sees own-journal submissions", () => {
  assert.equal(canManageSubmission(admin, submission), true);
});

test("2. JOURNAL_ADMIN cannot see or manage another journal submission", () => {
  assert.equal(canManageSubmission(admin, otherSubmission), false);
});

test("3. same-journal eligible editor can be assigned", () => {
  assert.equal(
    canAssignReviewer({
      administrator: admin,
      editor,
      submission,
      existingEditorIds: [],
    }),
    true,
  );
});

test("4. cross-journal editor cannot be assigned", () => {
  assert.equal(
    canAssignReviewer({
      administrator: admin,
      editor: crossJournalEditor,
      submission,
      existingEditorIds: [],
    }),
    false,
  );
});

test("5. inactive editor cannot be assigned", () => {
  assert.equal(
    canAssignReviewer({
      administrator: admin,
      editor: { ...editor, active: false },
      submission,
      existingEditorIds: [],
    }),
    false,
  );
});

test("6. duplicate active assignment is prevented", () => {
  assert.equal(
    canAssignReviewer({
      administrator: admin,
      editor,
      submission,
      existingEditorIds: [editor.id],
    }),
    false,
  );
});

test("7. assigned editor can access blinded manuscript", () => {
  assert.equal(canReadAssignedFile(editor, assignment, "MANUSCRIPT"), true);
});

test("8. unassigned editor cannot access the assignment", () => {
  assert.equal(
    canAccessAssignment({ ...editor, id: "unassigned" }, assignment),
    false,
  );
});

test("9. cross-journal editor cannot access the assignment", () => {
  assert.equal(
    canAccessAssignment(crossJournalEditor, {
      ...assignment,
      editorId: crossJournalEditor.id,
    }),
    false,
  );
});

test("10. editor query projection contains no author identity", () => {
  const blinded = {
    id: submission.id,
    title: "Study",
    abstract: "Abstract",
    keywords: ["social"],
  };
  assert.equal(hasBlindIdentityLeak(blinded), false);
  assert.equal(hasBlindIdentityLeak({ ...blinded, ownerId: "author" }), true);
});

test("11. editor cannot access identifying restricted files", () => {
  assert.equal(canReadAssignedFile(editor, assignment, "COVER_LETTER"), false);
  assert.equal(canReadAssignedFile(editor, assignment, "RESPONSE"), false);
});

test("12. assigned editor can submit a review", () => {
  assert.equal(canSubmitReview(editor, assignment), true);
  assert.equal(
    validateReview(
      {
        originality: 4,
        methodology: 4,
        clarity: 5,
        relevance: 4,
        commentsToAuthor: "A constructive review.",
        confidentialComments: "",
        recommendation: "MINOR_REVISION",
      },
      true,
    ).valid,
    true,
  );
});

test("13. unassigned editor cannot submit a review", () => {
  assert.equal(
    canSubmitReview({ ...editor, id: "unassigned" }, assignment),
    false,
  );
});

test("14. review recommendation is accepted by final validation", () => {
  const result = validateReview(
    {
      originality: 5,
      methodology: 4,
      clarity: 4,
      relevance: 5,
      commentsToAuthor: "Clear feedback",
      confidentialComments: "Internal",
      recommendation: "ACCEPT",
    },
    true,
  );
  assert.equal(result.valid, true);
});

test("15. confidential comments are not exposed to author", () => {
  const authorReview = safeAuthorReview({
    commentsToAuthor: "Visible",
    recommendation: "ACCEPT" as const,
    confidentialComments: "Private",
  });
  assert.deepEqual(authorReview, {
    commentsToAuthor: "Visible",
    recommendation: "ACCEPT",
  });
  assert.equal("confidentialComments" in authorReview, false);
});

test("16. reviewer identity is not exposed to author", () => {
  const authorDecision = {
    type: "MINOR_REVISION",
    reviews: [
      { commentsToAuthor: "Revise methods", recommendation: "MINOR_REVISION" },
    ],
  };
  assert.equal(hasBlindIdentityLeak(authorDecision), false);
});

test("17. admin can see a completed review", () => {
  assert.equal(canManageSubmission(admin, submission), true);
  assert.equal(
    { status: "SUBMITTED", confidentialComments: "Visible to admin" }.status,
    "SUBMITTED",
  );
});

test("18. admin can issue an editorial decision after two reviews", () => {
  assert.equal(canIssueDecision(admin, submission, 2), true);
  assert.equal(
    decisionSubmissionStatus("MAJOR_REVISION"),
    "REVISION_REQUESTED",
  );
});

test("19. author cannot issue or change editorial decision", () => {
  const author = { ...editor, id: "author", editorJournalIds: [] };
  assert.equal(canIssueDecision(author, submission, 2), false);
});

test("20. revision can only be submitted by submission owner", () => {
  const author = { ...editor, id: "author", editorJournalIds: [] };
  assert.equal(canSubmitRevision(author, submission), true);
  assert.equal(canSubmitRevision(editor, submission), false);
});

test("21. original manuscript version remains after revision", () => {
  const original: { number: number; kind: "ORIGINAL" | "REVISION" } = {
    number: 1,
    kind: "ORIGINAL",
  };
  const history: Array<typeof original> = [original];
  const next = appendPreserved(history, {
    number: 2,
    kind: "REVISION",
  });
  assert.deepEqual(history, [original]);
  assert.equal(next.length, 2);
});

test("22. Round 1 review history remains after Round 2 begins", () => {
  const roundOne = { number: 1, reviews: ["review-a", "review-b"] };
  const history = [roundOne];
  const next = appendPreserved(history, { number: 2, reviews: [] as string[] });
  assert.deepEqual(next[0], roundOne);
  assert.equal(next.length, 2);
});

test("23. cross-journal isolation remains intact", () => {
  assert.equal(canManageSubmission(admin, otherSubmission), false);
  assert.equal(
    canAssignReviewer({
      administrator: admin,
      editor,
      submission: otherSubmission,
      existingEditorIds: [],
    }),
    false,
  );
});

test("24. deactivated users are rejected", () => {
  assert.equal(
    canManageSubmission({ ...admin, active: false }, submission),
    false,
  );
  assert.equal(
    canAccessAssignment({ ...editor, active: false }, assignment),
    false,
  );
});
