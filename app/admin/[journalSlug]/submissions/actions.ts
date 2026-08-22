"use server";

import type { EditorialDecisionType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import {
  assignReviewer,
  beginInitialAssessment,
  cancelReviewerAssignment,
  EditorialMutationError,
  issueEditorialDecision,
  passInitialAssessment,
  returnForCorrection,
} from "@/lib/editorial/mutations";
import type { ActionState } from "@/lib/submissions/types";

const decisionTypes: EditorialDecisionType[] = [
  "ACCEPT",
  "MINOR_REVISION",
  "MAJOR_REVISION",
  "REJECT",
];

function errorState(error: unknown): ActionState {
  if (error instanceof EditorialMutationError) {
    return { error: error.message, fieldErrors: error.fieldErrors };
  }
  return { error: "That editorial change could not be saved. Try again." };
}

function refresh(journalSlug: string, submissionId: string) {
  revalidatePath(`/admin/${journalSlug}`);
  revalidatePath(`/admin/${journalSlug}/submissions/${submissionId}`);
  revalidatePath("/author/submissions");
}

export async function beginAssessmentAction(
  journalSlug: string,
  submissionId: string,
  _previous: ActionState,
): Promise<ActionState> {
  void _previous;
  const { user, journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  try {
    await beginInitialAssessment({
      adminId: user.id,
      journalId: journal.id,
      submissionId,
    });
    refresh(journalSlug, submissionId);
    return { message: "Initial assessment started." } as ActionState;
  } catch (error) {
    return errorState(error);
  }
}

export async function passAssessmentAction(
  journalSlug: string,
  submissionId: string,
  _previous: ActionState,
): Promise<ActionState> {
  void _previous;
  const { user, journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  try {
    const round = await passInitialAssessment({
      adminId: user.id,
      journalId: journal.id,
      submissionId,
    });
    refresh(journalSlug, submissionId);
    return {
      message: `Review round ${round.roundNumber} is ready for assignments.`,
    } as ActionState;
  } catch (error) {
    return errorState(error);
  }
}

export async function correctionAction(
  journalSlug: string,
  submissionId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  try {
    await returnForCorrection({
      adminId: user.id,
      journalId: journal.id,
      submissionId,
      message: String(formData.get("message") ?? ""),
    });
    refresh(journalSlug, submissionId);
    return { message: "Correction request sent to the author." } as ActionState;
  } catch (error) {
    return errorState(error);
  }
}

export async function assignReviewerAction(
  journalSlug: string,
  submissionId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  const dueValue = String(formData.get("dueAt") ?? "");
  const dueAt = dueValue ? new Date(`${dueValue}T23:59:59.000Z`) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    return { error: "Choose a valid review due date." };
  }
  try {
    await assignReviewer({
      adminId: user.id,
      journalId: journal.id,
      submissionId,
      editorId: String(formData.get("editorId") ?? ""),
      dueAt,
    });
    refresh(journalSlug, submissionId);
    return { message: "Reviewer assigned." } as ActionState;
  } catch (error) {
    return errorState(error);
  }
}

export async function cancelReviewerAction(
  journalSlug: string,
  submissionId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  try {
    await cancelReviewerAssignment({
      adminId: user.id,
      journalId: journal.id,
      submissionId,
      assignmentId: String(formData.get("assignmentId") ?? ""),
    });
    refresh(journalSlug, submissionId);
    return { message: "Reviewer assignment cancelled." } as ActionState;
  } catch (error) {
    return errorState(error);
  }
}

export async function decisionAction(
  journalSlug: string,
  submissionId: string,
  roundId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  const type = String(formData.get("type") ?? "") as EditorialDecisionType;
  if (!decisionTypes.includes(type)) {
    return { error: "Choose a valid editorial decision." };
  }
  const dueValue = String(formData.get("revisionDueAt") ?? "");
  const revisionDueAt = dueValue ? new Date(`${dueValue}T23:59:59.000Z`) : null;
  try {
    await issueEditorialDecision({
      adminId: user.id,
      journalId: journal.id,
      submissionId,
      roundId,
      type,
      reason: String(formData.get("reason") ?? ""),
      authorMessage: String(formData.get("authorMessage") ?? ""),
      revisionDueAt,
    });
    refresh(journalSlug, submissionId);
    return {
      message: "Editorial decision issued to the author.",
    } as ActionState;
  } catch (error) {
    return errorState(error);
  }
}
