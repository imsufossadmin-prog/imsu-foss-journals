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
  if (error instanceof Error) {
    if (
      error.message.includes("Unique constraint failed") ||
      error.message.includes("invocation") ||
      error.message.includes("prisma")
    ) {
      return {
        error:
          "A publication conflict occurred. Please check the volume, issue, or article order.",
      };
    }
    if (
      !error.message.includes("\n") &&
      !error.message.includes("PrismaClient") &&
      !error.message.includes("/")
    ) {
      return { error: error.message };
    }
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
  const { user, journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  const rawTrackingId = String(formData.get("trackingId") ?? "");
  try {
    await assignTrackingIdBySubmissionId({
      actorId: user.id,
      journalId: journal.id,
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
  const rawFiles = formData.getAll("attachments");
  const files: File[] = rawFiles.filter(
    (item): item is File => item instanceof File && item.size > 0,
  );

  const uploadedPaths: string[] = [];
  const bucket = storageBuckets.privateAcademicFiles;
  const supabase = createAdminClient();

  try {
    const attachmentsMetadata = [];
    for (const file of files) {
      const objectPath = `editorial/${journal.id}/${submissionId}/corrections/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error } = await supabase.storage
        .from(bucket)
        .upload(objectPath, bytes, { contentType: file.type, upsert: false });
      if (error) throw new Error("Correction attachment upload failed.");
      uploadedPaths.push(objectPath);
      attachmentsMetadata.push({
        bucket,
        objectPath,
        originalFileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    }

    await returnForCorrection({
      adminId: user.id,
      journalId: journal.id,
      submissionId,
      message: String(formData.get("message") ?? formData.get("body") ?? ""),
      attachments:
        attachmentsMetadata.length > 0 ? attachmentsMetadata : undefined,
    });
    refresh(journalSlug, submissionId);
    return { message: "Correction request sent to the author." } as ActionState;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(bucket).remove(uploadedPaths);
    }
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

  let productionObjectPath: string | null = null;
  let coverObjectPath: string | null = null;

  try {
    let coverImageUrl: string | undefined = undefined;
    let productionFileData:
      | {
          bucket: string;
          objectPath: string;
          originalFileName: string;
          mimeType: string;
          sizeBytes: number;
        }
      | undefined = undefined;

    let coverFileData:
      | {
          bucket: string;
          objectPath: string;
          originalFileName: string;
          mimeType: string;
          sizeBytes: number;
        }
      | undefined = undefined;

    const supabase = createAdminClient();

    // 1. Handle Final Production File
    const prodFile = formData.get("productionFile");
    if (prodFile && prodFile instanceof File && prodFile.size > 0) {
      const allowedMimes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ];
      const ext = prodFile.name.split(".").pop()?.toLowerCase();
      if (
        !allowedMimes.includes(prodFile.type) &&
        ext !== "pdf" &&
        ext !== "docx" &&
        ext !== "doc"
      ) {
        return {
          error:
            "Upload a valid PDF or DOCX file as the Final Production File.",
        };
      }

      const bytes = new Uint8Array(await prodFile.arrayBuffer());
      const path = createArticleObjectPath({
        journalId: journal.id,
        articleId: submissionId,
        originalFileName: prodFile.name,
      });

      const { error: uploadErr } = await supabase.storage
        .from(storageBuckets.publishedArticleFiles)
        .upload(path, bytes, {
          contentType: prodFile.type || "application/octet-stream",
          upsert: true,
          duplex: "half",
        });

      if (uploadErr) {
        throw new Error(`Production file upload failed: ${uploadErr.message}`);
      }

      productionObjectPath = path;
      productionFileData = {
        bucket: storageBuckets.publishedArticleFiles,
        objectPath: path,
        originalFileName: prodFile.name,
        mimeType: prodFile.type || "application/octet-stream",
        sizeBytes: prodFile.size,
      };
    }

    // 2. Handle Article Cover File
    const coverFile = formData.get("coverImageFile");
    if (coverFile && coverFile instanceof File && coverFile.size > 0) {
      const bytes = new Uint8Array(await coverFile.arrayBuffer());
      const path = createArticleObjectPath({
        journalId: journal.id,
        articleId: submissionId,
        originalFileName: coverFile.name,
      });

      const { error: coverErr } = await supabase.storage
        .from(storageBuckets.publishedArticleFiles)
        .upload(path, bytes, {
          contentType: coverFile.type || "image/jpeg",
          upsert: true,
          duplex: "half",
        });

      if (!coverErr) {
        coverObjectPath = path;
        const { data } = supabase.storage
          .from(storageBuckets.publishedArticleFiles)
          .getPublicUrl(path);
        coverImageUrl = data.publicUrl;
        coverFileData = {
          bucket: storageBuckets.publishedArticleFiles,
          objectPath: path,
          originalFileName: coverFile.name,
          mimeType: coverFile.type || "image/jpeg",
          sizeBytes: coverFile.size,
        };
      }
    }

    const doiRaw = String(formData.get("doi") ?? "").trim();
    const issueOrderRaw = String(formData.get("issueOrder") ?? "").trim();
    const issueOrder = issueOrderRaw ? parseInt(issueOrderRaw, 10) : undefined;

    await publishArticle({
      adminId: user.id,
      journalId: journal.id,
      submissionId,
      volume: String(formData.get("volume") ?? "").trim(),
      issue: String(formData.get("issue") ?? "").trim(),
      pageRange: String(formData.get("pageRange") ?? "").trim(),
      doi: doiRaw || undefined,
      coverImageUrl,
      issueOrder: isNaN(issueOrder as number) ? undefined : issueOrder,
      productionFile: productionFileData,
      coverFile: coverFileData,
    });

    refresh(journalSlug, submissionId);
    revalidatePath("/");
    revalidatePath("/current-issue");
    revalidatePath("/archives");
    revalidatePath("/admin/articles");
  } catch (error) {
    const supabase = createAdminClient();
    if (productionObjectPath) {
      await supabase.storage
        .from(storageBuckets.publishedArticleFiles)
        .remove([productionObjectPath]);
    }
    if (coverObjectPath) {
      await supabase.storage
        .from(storageBuckets.publishedArticleFiles)
        .remove([coverObjectPath]);
    }
    return errorState(error);
  }
  redirect("/admin/articles?success=published");
}

export async function closeIssueAction(
  journalSlug: string,
  issueId: string,
  _previous: ActionState,
): Promise<ActionState> {
  void _previous;
  const { user, journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  try {
    const { closeIssue } = await import("@/lib/editorial/issue-mutations");
    await closeIssue({
      adminId: user.id,
      journalId: journal.id,
      issueId,
    });
    revalidatePath(`/admin/${journalSlug}`);
    revalidatePath("/current-issue");
    revalidatePath("/archives");
    return { message: "Issue marked as Closed." } as ActionState;
  } catch (error) {
    return errorState(error);
  }
}

export async function reopenIssueAction(
  journalSlug: string,
  issueId: string,
  _previous: ActionState,
): Promise<ActionState> {
  void _previous;
  const { user, journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  try {
    const { reopenIssue } = await import("@/lib/editorial/issue-mutations");
    await reopenIssue({
      adminId: user.id,
      journalId: journal.id,
      issueId,
    });
    revalidatePath(`/admin/${journalSlug}`);
    revalidatePath("/current-issue");
    revalidatePath("/archives");
    return { message: "Issue reopened successfully." } as ActionState;
  } catch (error) {
    return errorState(error);
  }
}
