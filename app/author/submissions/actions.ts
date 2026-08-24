"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireGlobalRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import {
  changeDraftJournal,
  deleteDraftFileRecord,
  deleteDraftRecord,
  finalizeSubmission,
  getDraftFileForRemoval,
  getDraftFilesForDeletion,
  saveDraftAuthors,
  saveDraftDeclarations,
  saveDraftDetails,
  SubmissionMutationError,
} from "@/lib/submissions/mutations";
import type {
  ActionState,
  SubmissionAuthorInput,
} from "@/lib/submissions/types";
import { normalizeKeywords } from "@/lib/submissions/validation";
import { createClient } from "@/lib/supabase/server";

function actionError(error: unknown): ActionState {
  if (error instanceof SubmissionMutationError) {
    return { error: error.message, fieldErrors: error.fieldErrors };
  }
  return { error: "We couldn’t save that change. Please try again." };
}

function numberField(formData: FormData, name: string) {
  const value = Number(formData.get(name));
  return Number.isInteger(value) && value > 0 ? value : 0;
}

export async function createDraftAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void formData;
  await requireGlobalRole("AUTHOR");
  redirect("/author/requests/new");
}

export async function saveJournalAction(
  submissionId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireGlobalRole("AUTHOR");
  try {
    await changeDraftJournal({
      ownerId: user.id,
      submissionId,
      journalId: String(formData.get("journalId") ?? ""),
      version: numberField(formData, "version"),
    });
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/author");
  redirect(`/author/submissions/${submissionId}/edit/details`);
}

export async function saveDetailsAction(
  submissionId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireGlobalRole("AUTHOR");
  try {
    await saveDraftDetails({
      ownerId: user.id,
      submissionId,
      version: numberField(formData, "version"),
      title: String(formData.get("title") ?? ""),
      abstract: String(formData.get("abstract") ?? ""),
      keywords: normalizeKeywords(String(formData.get("keywords") ?? "")),
    });
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/author");
  redirect(`/author/submissions/${submissionId}/edit/authors`);
}

export async function saveAuthorsAction(
  submissionId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireGlobalRole("AUTHOR");
  let authors: SubmissionAuthorInput[];
  try {
    authors = JSON.parse(String(formData.get("authors") ?? "[]"));
    if (!Array.isArray(authors)) throw new Error("Invalid authors");
  } catch {
    return { error: "The author list could not be read. Please try again." };
  }
  try {
    await saveDraftAuthors({
      ownerId: user.id,
      submissionId,
      version: numberField(formData, "version"),
      authors,
    });
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/author");
  redirect(`/author/submissions/${submissionId}/edit/files`);
}

export async function saveDeclarationsAction(
  submissionId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireGlobalRole("AUTHOR");
  try {
    await saveDraftDeclarations({
      ownerId: user.id,
      submissionId,
      version: numberField(formData, "version"),
      declarationAccuracy: formData.get("declarationAccuracy") === "on",
      declarationAuthority: formData.get("declarationAuthority") === "on",
      declarationReadiness: formData.get("declarationReadiness") === "on",
    });
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/author");
  redirect(`/author/submissions/${submissionId}/edit/review`);
}

export async function finalizeSubmissionAction(
  submissionId: string,
  _previousState: ActionState,
): Promise<ActionState> {
  void _previousState;
  const user = await requireGlobalRole("AUTHOR");
  try {
    await finalizeSubmission(user.id, submissionId);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/author");
  redirect(`/author/submissions/${submissionId}/submitted`);
}

export async function removeSubmissionFileAction(
  submissionId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireGlobalRole("AUTHOR");
  try {
    const file = await getDraftFileForRemoval({
      ownerId: user.id,
      submissionId,
      submissionFileId: String(formData.get("submissionFileId") ?? ""),
    });
    await deleteDraftFileRecord({
      ownerId: user.id,
      submissionId,
      submissionFileId: file.id,
      storedFileId: file.storedFileId,
      version: numberField(formData, "version"),
    });
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(file.storedFile.bucket)
      .remove([file.storedFile.objectPath]);
    if (error) console.error("Draft file cleanup failed", error.message);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/author/submissions/${submissionId}/edit/files`);
  return {};
}

export async function deleteDraftAction(
  submissionId: string,
  _formData: FormData,
) {
  void _formData;
  const user = await requireGlobalRole("AUTHOR");

  const linkedRequest = await prisma.submissionRequest.findFirst({
    where: { submissionId, authorId: user.id },
    select: { id: true },
  });

  const files = await getDraftFilesForDeletion(user.id, submissionId);
  if (files.length > 0) {
    const supabase = await createClient();
    const grouped = new Map<string, typeof files>();
    for (const file of files) {
      const bucketFiles = grouped.get(file.storedFile.bucket) ?? [];
      bucketFiles.push(file);
      grouped.set(file.storedFile.bucket, bucketFiles);
    }
    for (const [bucket, bucketFiles] of grouped.entries()) {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(bucketFiles.map(({ storedFile }) => storedFile.objectPath));
      if (error) {
        throw new SubmissionMutationError(
          "Private files could not be cleaned up. The draft was not deleted.",
        );
      }
    }
  }
  await deleteDraftRecord(
    user.id,
    submissionId,
    files.map(({ storedFileId }) => storedFileId),
  );
  revalidatePath("/author");
  revalidatePath("/author/requests");
  if (linkedRequest) {
    revalidatePath(`/author/requests/${linkedRequest.id}`);
  }
  revalidatePath("/author/submissions");
  revalidatePath("/admin/requests");

  if (linkedRequest) {
    redirect(`/author/requests/${linkedRequest.id}`);
  } else {
    redirect("/author");
  }
}
