"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireGlobalRole } from "@/lib/auth/authorization";
import {
  beginRequestSubmission,
  createSubmissionRequest,
  finalizeRequestSubmission,
  RequestMutationError,
  saveSimpleArticle,
  sendRequestMessage,
} from "@/lib/requests/mutations";
import { normalizeKeywords } from "@/lib/submissions/validation";
import type { SubmissionAuthorInput } from "@/lib/submissions/types";

export type RequestActionState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

function failure(error: unknown): RequestActionState {
  return error instanceof RequestMutationError
    ? { error: error.message, fieldErrors: error.fieldErrors }
    : { error: "We couldn’t save that change. Please try again." };
}

export async function startRequestAction(formData?: FormData) {
  const user = await requireGlobalRole("AUTHOR");
  const journalSlug = formData
    ? String(formData.get("journalSlug") ?? "")
    : undefined;
  const request = await createSubmissionRequest(user.id, journalSlug);
  redirect(`/author/requests/${request.id}`);
}

export async function sendAuthorMessageAction(
  requestId: string,
  _state: RequestActionState,
  formData: FormData,
) {
  const user = await requireGlobalRole("AUTHOR");
  try {
    await sendRequestMessage({
      actorId: user.id,
      requestId,
      body: String(formData.get("body") ?? ""),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/author/requests/${requestId}`);
  return { message: "Message sent." };
}

export async function beginSubmissionAction(requestId: string) {
  const user = await requireGlobalRole("AUTHOR");
  const submission = await beginRequestSubmission(user.id, requestId);
  redirect(`/author/requests/${requestId}/submit?submission=${submission.id}`);
}

export async function saveSimpleArticleAction(
  requestId: string,
  submissionId: string,
  _state: RequestActionState,
  formData: FormData,
) {
  const user = await requireGlobalRole("AUTHOR");
  let authors: SubmissionAuthorInput[];
  try {
    authors = JSON.parse(String(formData.get("authors") ?? "[]"));
    if (!Array.isArray(authors)) throw new Error();
  } catch {
    return { error: "The author list could not be read." };
  }
  try {
    await saveSimpleArticle({
      authorId: user.id,
      requestId,
      submissionId,
      version: Number(formData.get("version")),
      title: String(formData.get("title") ?? ""),
      abstract: String(formData.get("abstract") ?? ""),
      keywords: normalizeKeywords(String(formData.get("keywords") ?? "")),
      authors,
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/author/requests/${requestId}/submit`);
  return { message: "Article details saved." };
}

export async function submitSimpleArticleAction(
  requestId: string,
  submissionId: string,
  _state: RequestActionState,
  formData: FormData,
) {
  void _state;
  const user = await requireGlobalRole("AUTHOR");
  try {
    let authors: SubmissionAuthorInput[] = [];
    try {
      authors = JSON.parse(String(formData.get("authors") ?? "[]"));
      if (!Array.isArray(authors)) authors = [];
    } catch {
      authors = [];
    }

    const title = String(formData.get("title") ?? "").trim();
    const abstract = String(formData.get("abstract") ?? "").trim();
    const keywords = String(formData.get("keywords") ?? "").trim();

    await saveSimpleArticle({
      authorId: user.id,
      requestId,
      submissionId,
      version: Number(formData.get("version") ?? "1"),
      title,
      abstract,
      keywords: normalizeKeywords(keywords),
      authors,
    });

    await finalizeRequestSubmission(user.id, requestId, submissionId);
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/author");
  redirect(`/author/requests/${requestId}`);
}
