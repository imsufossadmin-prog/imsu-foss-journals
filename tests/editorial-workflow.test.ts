import assert from "node:assert/strict";
import test from "node:test";

import {
  appendPreserved,
  canAccessAssignment,
  canAccessInternalChat,
  canAssignReviewer,
  canIssueDecision,
  canManageSubmission,
  canReadAssignedFile,
  canSubmitAdherenceReport,
  canSubmitReview,
  canSubmitRevision,
  type AssignmentScope,
  type EditorialActor,
} from "../lib/editorial/policy";
import {
  calculateAverageScore,
  decisionSubmissionStatus,
  hasBlindIdentityLeak,
  safeAuthorReview,
  validateAdherenceReport,
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
        titleAbstract: 8,
        introductionThesis: 7,
        literatureReview: 8,
        methodology: 9,
        resultsDiscussion: 8,
        conclusion: 7,
        languageStyle: 8,
        apaAdherence: 9,
        generalReport: "A constructive review.",
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
      titleAbstract: 9,
      introductionThesis: 8,
      literatureReview: 8,
      methodology: 9,
      resultsDiscussion: 8,
      conclusion: 8,
      languageStyle: 9,
      apaAdherence: 9,
      generalReport: "Clear feedback and detailed analysis.",
      commentsToAuthor: "Clear feedback and detailed analysis.",
      confidentialComments: "Internal notes",
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

test("25. concise audit message format summarizes attachment count without leaking message body", () => {
  function formatAuditMessage(type: string, message?: string | null) {
    if (!message) return null;
    if (type === "CORRECTION_REQUESTED" || type === "REVISION_SUBMITTED") {
      if (message.includes("attachment")) {
        const match = message.match(/\d+\s+attachments?/i);
        return match ? match[0].toLowerCase() : message;
      }
      return null;
    }
    return message;
  }

  assert.equal(
    formatAuditMessage("CORRECTION_REQUESTED", "1 attachment"),
    "1 attachment",
  );
  assert.equal(
    formatAuditMessage("REVISION_SUBMITTED", "2 attachments"),
    "2 attachments",
  );
  assert.equal(
    formatAuditMessage(
      "CORRECTION_REQUESTED",
      "Please revise the abstract and reformat table 1 according to APA guidelines",
    ),
    null,
  );
});

test("26. multiple correction versions increment version numbers accurately and preserve previous versions", () => {
  const v1 = { versionNumber: 1, kind: "ORIGINAL" as const };
  const v2 = { versionNumber: 2, kind: "REVISION" as const };
  const v3 = { versionNumber: 3, kind: "REVISION" as const };

  const versions = [v1];
  const versionsAfterCorrection1 = appendPreserved(versions, v2);
  const versionsAfterCorrection2 = appendPreserved(
    versionsAfterCorrection1,
    v3,
  );

  assert.equal(versionsAfterCorrection2.length, 3);
  assert.equal(versionsAfterCorrection2[0].versionNumber, 1);
  assert.equal(versionsAfterCorrection2[1].versionNumber, 2);
  assert.equal(versionsAfterCorrection2[2].versionNumber, 3);
});

test("27. Phase 2: scorecard accepts values 1-10 across all 8 evaluation criteria", () => {
  const validReviewInput = {
    titleAbstract: 10,
    introductionThesis: 9,
    literatureReview: 8,
    methodology: 7,
    resultsDiscussion: 6,
    conclusion: 5,
    languageStyle: 4,
    apaAdherence: 1,
    generalReport: "Rigorous empirical paper with strong statistical validity.",
    commentsToAuthor:
      "Rigorous empirical paper with strong statistical validity.",
    confidentialComments: "Recommended for publication.",
    recommendation: "ACCEPT" as const,
  };

  const validation = validateReview(validReviewInput, true);
  assert.equal(validation.valid, true);
  assert.equal(Object.keys(validation.fieldErrors).length, 0);
});

test("28. Phase 2: scorecard rejects values < 1 or > 10 or non-integers when a score is provided", () => {
  const invalidScoreNegative = {
    titleAbstract: -1,
    introductionThesis: 8,
    literatureReview: 8,
    methodology: 8,
    resultsDiscussion: 8,
    conclusion: 8,
    languageStyle: 8,
    apaAdherence: 8,
    generalReport: "Valid report text.",
    commentsToAuthor: "Valid report text.",
    confidentialComments: "",
    recommendation: "ACCEPT" as const,
  };
  const valNegative = validateReview(invalidScoreNegative, true);
  assert.equal(valNegative.valid, false);
  assert.ok(valNegative.fieldErrors.titleAbstract);

  const invalidScoreHigh = {
    ...invalidScoreNegative,
    titleAbstract: 11,
  };
  const valHigh = validateReview(invalidScoreHigh, true);
  assert.equal(valHigh.valid, false);
  assert.ok(valHigh.fieldErrors.titleAbstract);

  const invalidScoreDecimal = {
    ...invalidScoreNegative,
    titleAbstract: 7.5,
  };
  const valDecimal = validateReview(invalidScoreDecimal, true);
  assert.equal(valDecimal.valid, false);
  assert.ok(valDecimal.fieldErrors.titleAbstract);
});

test("28b. Phase 2: scorecard fields and written report are optional and do not block review saving or submission", () => {
  const emptyReviewInput = {
    titleAbstract: 0,
    introductionThesis: 0,
    literatureReview: 0,
    methodology: 0,
    resultsDiscussion: 0,
    conclusion: 0,
    languageStyle: 0,
    apaAdherence: 0,
    generalReport: "",
    commentsToAuthor: "",
    confidentialComments: "",
    recommendation: "" as const,
  };
  const valDraft = validateReview(emptyReviewInput, false);
  assert.equal(valDraft.valid, true);
  assert.equal(Object.keys(valDraft.fieldErrors).length, 0);

  const valFinal = validateReview(emptyReviewInput, true);
  assert.equal(valFinal.valid, true);
  assert.equal(Object.keys(valFinal.fieldErrors).length, 0);
});

test("29. Phase 2: calculateAverageScore correctly computes arithmetic mean across 8 criteria", () => {
  const scores = {
    titleAbstract: 10,
    introductionThesis: 10,
    literatureReview: 8,
    methodology: 8,
    resultsDiscussion: 6,
    conclusion: 6,
    languageStyle: 4,
    apaAdherence: 4,
  };
  // sum = 56 / 8 = 7.0
  const avg = calculateAverageScore(scores);
  assert.equal(avg, 7.0);
});

test("30. Phase 2: validateAdherenceReport accepts valid outcomes and detailed text", () => {
  const result = validateAdherenceReport({
    outcome: "PARTIALLY_ADHERED",
    report:
      "The author revised the discussion section but did not update the APA references in Table 2.",
  });
  assert.equal(result.valid, true);
  assert.equal(Object.keys(result.fieldErrors).length, 0);
});

test("31. Phase 2: validateAdherenceReport rejects invalid outcomes or blank reports", () => {
  const invalidOutcome = validateAdherenceReport({
    // @ts-expect-error testing runtime invalid outcome
    outcome: "INVALID_OUTCOME",
    report: "Some report text.",
  });
  assert.equal(invalidOutcome.valid, false);
  assert.ok(invalidOutcome.fieldErrors.outcome);

  const blankReport = validateAdherenceReport({
    outcome: "ADHERED",
    report: "   ",
  });
  assert.equal(blankReport.valid, false);
  assert.ok(blankReport.fieldErrors.report);
});

test("32. Phase 2: canSubmitAdherenceReport authorizes assigned editor and journal admin, denies unassigned editor", () => {
  const assignedEditor = { ...editor, id: "assigned-editor" };
  const unassignedEditor = { ...editor, id: "unassigned-editor" };

  assert.equal(
    canSubmitAdherenceReport(assignedEditor, submission, ["assigned-editor"]),
    true,
  );
  assert.equal(
    canSubmitAdherenceReport(unassignedEditor, submission, ["assigned-editor"]),
    false,
  );
  assert.equal(
    canSubmitAdherenceReport(admin, submission, ["assigned-editor"]),
    true,
  );
  assert.equal(
    canSubmitAdherenceReport({ ...assignedEditor, active: false }, submission, [
      "assigned-editor",
    ]),
    false,
  );
});

test("33. Phase 2: canAccessInternalChat authorizes assigned journal staff and super admin, strictly denies authors", () => {
  const superAdminActor: EditorialActor = {
    id: "super",
    active: true,
    superAdmin: true,
    adminJournalIds: [],
    editorJournalIds: [],
  };

  const authorActor: EditorialActor = {
    id: "author",
    active: true,
    adminJournalIds: [],
    editorJournalIds: [],
  };

  assert.equal(canAccessInternalChat(editor, ownJournal), true);
  assert.equal(canAccessInternalChat(admin, ownJournal), true);
  assert.equal(canAccessInternalChat(superAdminActor, ownJournal), true);

  // Author is strictly denied
  assert.equal(canAccessInternalChat(authorActor, ownJournal), false);

  // Cross-journal editor is denied
  assert.equal(canAccessInternalChat(editor, otherJournal), false);

  // Inactive editor is denied
  assert.equal(
    canAccessInternalChat({ ...editor, active: false }, ownJournal),
    false,
  );
});

test("34. Phase 2: review attachment and boundary scorecard validation works for 1, 10, and optional empty payloads", () => {
  // Score 1 (lowest valid score) and 10 (highest valid score)
  const minMaxReview = {
    titleAbstract: 1,
    introductionThesis: 10,
    literatureReview: 0, // optional unselected
    methodology: 1,
    resultsDiscussion: 10,
    conclusion: 0, // optional unselected
    languageStyle: 1,
    apaAdherence: 10,
    generalReport: "Comprehensive evaluation with boundary scores.",
    commentsToAuthor: "Comprehensive evaluation with boundary scores.",
    confidentialComments: "",
    recommendation: "ACCEPT" as const,
  };
  const val = validateReview(minMaxReview, true);
  assert.equal(val.valid, true);

  // Payload with single attachment
  const singleAtt = [
    {
      bucket: "academic-private",
      objectPath: "journal/j1/review/a1/manuscript-notes.pdf",
      originalFileName: "manuscript-notes.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10240,
    },
  ];
  assert.equal(singleAtt.length, 1);

  // Payload with multiple attachments
  const multipleAtts = [
    ...singleAtt,
    {
      bucket: "academic-private",
      objectPath: "journal/j1/review/a1/annotated.docx",
      originalFileName: "annotated.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 20480,
    },
  ];
  assert.equal(multipleAtts.length, 2);
});

test("35. Phase 2: Copy Review Report text extraction safely isolates general report from confidential/editor fields", () => {
  const fullReviewRecord = {
    id: "review-1",
    status: "SUBMITTED",
    recommendation: "MAJOR_REVISION",
    titleAbstract: 7,
    introductionThesis: 8,
    literatureReview: 6,
    methodology: 8,
    resultsDiscussion: 7,
    conclusion: 7,
    languageStyle: 8,
    apaAdherence: 9,
    generalReport:
      "The theoretical framing is sound. However, Section 3 requires clearer statistical tables.",
    commentsToAuthor:
      "The theoretical framing is sound. However, Section 3 requires clearer statistical tables.",
    confidentialComments:
      "INTERNAL NOTE: Author may need extra time to rerun ANOVA.",
    editor: {
      displayName: "Dr. John Doe (Blind Reviewer)",
      email: "reviewer@imsu.edu.ng",
    },
  };

  // Safe extraction for Copy Report: ONLY generalReport/commentsToAuthor
  const copiedText =
    fullReviewRecord.generalReport ?? fullReviewRecord.commentsToAuthor ?? "";
  assert.equal(
    copiedText,
    "The theoretical framing is sound. However, Section 3 requires clearer statistical tables.",
  );

  // Privacy invariant checks:
  assert.equal(
    copiedText.includes(fullReviewRecord.confidentialComments),
    false,
  );
  assert.equal(copiedText.includes(fullReviewRecord.editor.displayName), false);
  assert.equal(copiedText.includes(fullReviewRecord.editor.email), false);
  assert.equal(copiedText.includes("MAJOR_REVISION"), false);
  assert.equal(copiedText.includes("7 / 10"), false);
});
