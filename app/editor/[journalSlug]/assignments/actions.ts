"use server";

import type { ReviewRecommendation } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import {
  EditorialMutationError,
  saveEditorReview,
} from "@/lib/editorial/mutations";
import type { ActionState } from "@/lib/submissions/types";

const recommendations: ReviewRecommendation[] = [
  "ACCEPT",
  "MINOR_REVISION",
  "MAJOR_REVISION",
  "REJECT",
];

function score(formData: FormData, name: string) {
  const value = Number(formData.get(name));
  return Number.isInteger(value) ? value : 0;
}

export async function saveReviewAction(
  journalSlug: string,
  assignmentId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, journal } = await requireJournalWorkspace(
    "EDITOR",
    journalSlug,
  );
  const final = formData.get("intent") === "submit";
  const recommendationValue = String(formData.get("recommendation") ?? "");
  const recommendation = recommendations.includes(
    recommendationValue as ReviewRecommendation,
  )
    ? (recommendationValue as ReviewRecommendation)
    : "";
  try {
    await saveEditorReview({
      editorId: user.id,
      journalId: journal.id,
      assignmentId,
      reviewVersion: Number(formData.get("reviewVersion") ?? 0),
      final,
      review: {
        originality: score(formData, "originality"),
        methodology: score(formData, "methodology"),
        clarity: score(formData, "clarity"),
        relevance: score(formData, "relevance"),
        commentsToAuthor: String(formData.get("commentsToAuthor") ?? ""),
        confidentialComments: String(
          formData.get("confidentialComments") ?? "",
        ),
        recommendation,
      },
    });
    revalidatePath(`/editor/${journalSlug}`);
    revalidatePath(`/editor/${journalSlug}/assignments/${assignmentId}`);
    revalidatePath(`/admin/${journalSlug}`);
    return {
      message: final
        ? "Review submitted. It is now locked."
        : "Review draft saved.",
    };
  } catch (error) {
    if (error instanceof EditorialMutationError) {
      return { error: error.message, fieldErrors: error.fieldErrors };
    }
    return { error: "The review could not be saved. Try again." };
  }
}
