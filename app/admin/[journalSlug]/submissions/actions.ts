"use server";

import type { EditorialDecisionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import {
  assignReviewer,
  beginInitialAssessment,
  cancelReviewerAssignment,
  EditorialMutationError,
  issueEditorialDecision,
  markRevisionReceived,
  passInitialAssessment,
  publishArticle,
  returnForCorrection,
  skipToPublishing,
} from "@/lib/editorial/mutations";
import {
  assignTrackingIdBySubmissionId,
  RequestMutationError,
} from "@/lib/requests/mutations";
import { createArticleObjectPath, storageBuckets } from "@/lib/storage/paths";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/submissions/types";

const decisionTypes: EditorialDecisionType[] = [
  "ACCEPT",
  "MINOR_REVISION",
  "MAJOR_REVISION",
  "REJECT",
];

function errorState(error: unknown): ActionState {
  console.error("Editorial action failure:", error);
  if (
    error instanceof EditorialMutationError ||
    error instanceof RequestMutationError
  ) {
    return { error: error.message, fieldErrors: error.fieldErrors };
  }
  if (error && typeof error === "object" && "message" in error) {
    return { error: String((error as { message: string }).message) };
  }
  return { error: "That editorial change could not be saved. Try again." };
}

function refresh(journalSlug: string, submissionId: string) {
  revalidatePath(`/admin/${journalSlug}/submissions/${submissionId}`);
  revalidatePath(`/author/submissions/${submissionId}`);
}

export async function markRevisionReceivedAction(
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
    await markRevisionReceived({
      adminId: user.id,
      journalId: journal.id,
      submissionId,
    });
    refresh(journalSlug, submissionId);
    return { message: "Revision marked as received." } as ActionState;
  } catch (error) {
    return errorState(error);
  }
}

export async function assignTrackingIdAction(
  journalSlug: string,
  submissionId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void _previous;
  const { user } = await requireJournalWorkspace("JOURNAL_ADMIN", journalSlug);
  const rawTrackingId = String(formData.get("trackingId") ?? "");
  try {
    await assignTrackingIdBySubmissionId({
      actorId: user.id,
      submissionId,
      trackingId: rawTrackingId,
    });
    refresh(journalSlug, submissionId);
    return { message: "Tracking ID assigned successfully." } as ActionState;
  } catch (error) {
    return errorState(error);
  }
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

export async function skipToPublishingAction(
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
    await skipToPublishing({
      adminId: user.id,
      journalId: journal.id,
      submissionId,
    });
    refresh(journalSlug, submissionId);
    revalidatePath("/");
    revalidatePath("/current-issue");
    revalidatePath("/archives");
    return { message: "Approved for Publishing & Production." } as ActionState;
  } catch (error) {
    return errorState(error);
  }
}

export async function publishArticleAction(
  journalSlug: string,
  submissionId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void _previous;
  const { user, journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  try {
    let coverImageUrl: string | undefined = undefined;
    const coverFile = formData.get("coverImageFile");
    if (coverFile && coverFile instanceof File && coverFile.size > 0) {
      const bytes = new Uint8Array(await coverFile.arrayBuffer());
      const path = createArticleObjectPath({
        journalId: journal.id,
        articleId: submissionId,
        originalFileName: coverFile.name,
      });
      const supabase = createAdminClient();
      const { error } = await supabase.storage
        .from(storageBuckets.publishedArticleFiles)
        .upload(path, bytes, {
          contentType: coverFile.type,
          upsert: true,
          duplex: "half",
        });
      if (!error) {
        const { data } = supabase.storage
          .from(storageBuckets.publishedArticleFiles)
          .getPublicUrl(path);
        coverImageUrl = data.publicUrl;
      }
    }

    const doiRaw = String(formData.get("doi") ?? "").trim();

    await publishArticle({
      adminId: user.id,
      journalId: journal.id,
      submissionId,
      volume: String(formData.get("volume") ?? "").trim(),
      issue: String(formData.get("issue") ?? "").trim(),
      pageRange: String(formData.get("pageRange") ?? "").trim(),
      doi: doiRaw || undefined,
      coverImageUrl,
    });
    refresh(journalSlug, submissionId);
    revalidatePath("/archives");
    revalidatePath("/admin/articles");
    redirect(
      `/admin/${journalSlug}/submissions/${submissionId}?published=true`,
    );
  } catch (error) {
    return errorState(error);
  }
}
