export type EditorialActor = {
  id: string;
  active: boolean;
  superAdmin?: boolean;
  adminJournalIds: string[];
  editorJournalIds: string[];
};

export type SubmissionScope = {
  id: string;
  journalId: string;
  ownerId: string;
};

export type AssignmentScope = {
  id: string;
  editorId: string;
  journalId: string;
  submissionId: string;
  status: "ASSIGNED" | "IN_REVIEW" | "COMPLETED" | "DECLINED" | "CANCELLED";
};

export function canManageSubmission(
  actor: EditorialActor,
  submission: SubmissionScope,
) {
  return (
    actor.active &&
    (Boolean(actor.superAdmin) ||
      actor.adminJournalIds.includes(submission.journalId))
  );
}

export function canAssignReviewer(input: {
  administrator: EditorialActor;
  editor: EditorialActor;
  submission: SubmissionScope;
  existingEditorIds: string[];
}) {
  return (
    canManageSubmission(input.administrator, input.submission) &&
    input.editor.active &&
    input.editor.id !== input.administrator.id &&
    input.editor.editorJournalIds.includes(input.submission.journalId) &&
    !input.existingEditorIds.includes(input.editor.id)
  );
}

export function canAccessAssignment(
  actor: EditorialActor,
  assignment: AssignmentScope,
) {
  return (
    actor.active &&
    actor.id === assignment.editorId &&
    actor.editorJournalIds.includes(assignment.journalId) &&
    !["DECLINED", "CANCELLED"].includes(assignment.status)
  );
}

export function canSubmitReview(
  actor: EditorialActor,
  assignment: AssignmentScope,
) {
  return (
    canAccessAssignment(actor, assignment) && assignment.status !== "COMPLETED"
  );
}

export function canReadAssignedFile(
  actor: EditorialActor,
  assignment: AssignmentScope,
  fileKind: "MANUSCRIPT" | "RESPONSE" | "COVER_LETTER",
) {
  return canAccessAssignment(actor, assignment) && fileKind === "MANUSCRIPT";
}

export function canIssueDecision(
  actor: EditorialActor,
  submission: SubmissionScope,
  completedReviews: number,
) {
  return canManageSubmission(actor, submission) && completedReviews >= 2;
}

export function canSubmitAdherenceReport(
  actor: EditorialActor,
  submission: SubmissionScope,
  assignedEditorIds: string[],
) {
  if (!actor.active) return false;
  if (
    actor.superAdmin ||
    actor.adminJournalIds.includes(submission.journalId)
  ) {
    return true;
  }
  return (
    actor.editorJournalIds.includes(submission.journalId) &&
    assignedEditorIds.includes(actor.id)
  );
}

export function canAccessInternalChat(
  actor: EditorialActor,
  journalId: string,
) {
  if (!actor.active) return false;
  return (
    Boolean(actor.superAdmin) ||
    actor.adminJournalIds.includes(journalId) ||
    actor.editorJournalIds.includes(journalId)
  );
}

export function canSubmitRevision(
  actor: EditorialActor,
  submission: SubmissionScope,
) {
  return actor.active && actor.id === submission.ownerId;
}

export function appendPreserved<T>(history: readonly T[], item: T) {
  return [...history, item];
}
