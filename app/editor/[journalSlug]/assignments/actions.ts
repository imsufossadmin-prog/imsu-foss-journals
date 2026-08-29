"use server";

import type { ReviewRecommendation } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import {
  EditorialMutationError,
  saveEditorReview,
  submitAdherenceReport,
} from "@/lib/editorial/mutations";
import {
  createReviewAttachmentObjectPath,
  storageBuckets,
} from "@/lib/storage/paths";
import type { ActionState } from "@/lib/submissions/types";
import { matchesWordUploadSignature } from "@/lib/submissions/validation";
import { createAdminClient } from "@/lib/supabase/admin";

const recommendations: ReviewRecommendation[] = [
  "ACCEPT",
  "MINOR_REVISION",
  "MAJOR_REVISION",
  "REJECT",
];

const allowedExtensions = new Set(["pdf", "doc", "docx", "jpg", "jpeg", "png"]);
const maxBytes = 20 * 1024 * 1024;

function validReviewAttachmentSignature(file: File, bytes: Uint8Array) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (extension === "png" || file.type === "image/png") {
    return bytes
      .slice(0, 8)
      .every(
        (val, idx) =>
          val === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][idx],
      );
  }

  if (
    extension === "jpg" ||
    extension === "jpeg" ||
    file.type === "image/jpeg" ||
    file.type === "image/pjpeg"
  ) {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (extension === "pdf" || file.type === "application/pdf") {
    return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }

  return matchesWordUploadSignature(file.type, bytes, extension);
}

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

  const generalReport = String(
    formData.get("generalReport") || formData.get("commentsToAuthor") || "",
  );

  const rawFiles = formData.getAll("attachments");
  const filesToUpload: File[] = [];
  for (const item of rawFiles) {
    if (item instanceof File && item.size > 0 && item.name) {
      if (item.size > maxBytes) {
        return { error: `File "${item.name}" exceeds the 20 MB size limit.` };
      }
      const extension = item.name.split(".").pop()?.toLowerCase() ?? "";
      if (!allowedExtensions.has(extension)) {
        return {
          error: `File "${item.name}" has an unsupported format. Please upload PDF, Word (DOC/DOCX), or image documents.`,
        };
      }
      const signature = new Uint8Array(await item.slice(0, 8).arrayBuffer());
      if (!validReviewAttachmentSignature(item, signature)) {
        return {
          error: `File "${item.name}" contents do not match its file extension.`,
        };
      }
      filesToUpload.push(item);
    }
  }

  const uploadedFiles: Array<{
    bucket: string;
    objectPath: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
  }> = [];

  const bucket = storageBuckets.privateAcademicFiles;
  const supabase = createAdminClient();

  if (filesToUpload.length > 0) {
    for (const file of filesToUpload) {
      const objectPath = createReviewAttachmentObjectPath({
        journalId: journal.id,
        assignmentId,
        originalFileName: file.name,
      });

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        if (uploadedFiles.length > 0) {
          await supabase.storage
            .from(bucket)
            .remove(uploadedFiles.map((u) => u.objectPath));
        }
        return {
          error: `Failed to upload "${file.name}". Please try again.`,
        };
      }

      uploadedFiles.push({
        bucket,
        objectPath,
        originalFileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
    }
  }

  try {
    await saveEditorReview({
      editorId: user.id,
      journalId: journal.id,
      assignmentId,
      reviewVersion: Number(formData.get("reviewVersion") ?? 0),
      final,
      review: {
        titleAbstract: score(formData, "titleAbstract"),
        introductionThesis: score(formData, "introductionThesis"),
        literatureReview: score(formData, "literatureReview"),
        methodology: score(formData, "methodology"),
        resultsDiscussion: score(formData, "resultsDiscussion"),
        conclusion: score(formData, "conclusion"),
        languageStyle: score(formData, "languageStyle"),
        apaAdherence: score(formData, "apaAdherence"),
        generalReport,
        commentsToAuthor: generalReport,
        confidentialComments: String(
          formData.get("confidentialComments") ?? "",
        ),
        recommendation,
      },
      attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    });
    revalidatePath(`/editor/${journalSlug}`);
    revalidatePath(`/editor/${journalSlug}/assignments/${assignmentId}`);
    revalidatePath(`/admin/${journalSlug}`);
    return {
      message: final ? "Review submitted successfully." : "Review draft saved.",
    };
  } catch (error) {
    if (uploadedFiles.length > 0) {
      await supabase.storage
        .from(bucket)
        .remove(uploadedFiles.map((u) => u.objectPath));
    }
    if (error instanceof EditorialMutationError) {
      return { error: error.message, fieldErrors: error.fieldErrors };
    }
    console.error("saveReviewAction error:", error);
    return { error: "The review could not be saved. Try again." };
  }
}

export async function submitAdherenceReportAction(
  journalSlug: string,
  submissionId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, journal } = await requireJournalWorkspace(
    "EDITOR",
    journalSlug,
  );
  const outcome = String(formData.get("outcome") ?? "");
  const report = String(formData.get("report") ?? "");

  if (!["ADHERED", "PARTIALLY_ADHERED", "DID_NOT_ADHERE"].includes(outcome)) {
    return { error: "Please select a valid adherence outcome." };
  }

  try {
    await submitAdherenceReport({
      editorId: user.id,
      journalId: journal.id,
      submissionId,
      outcome: outcome as "ADHERED" | "PARTIALLY_ADHERED" | "DID_NOT_ADHERE",
      report,
    });

    revalidatePath(`/editor/${journalSlug}`);
    revalidatePath(`/admin/${journalSlug}`);
    revalidatePath(`/admin/${journalSlug}/submissions/${submissionId}`);
    return { message: "Adherence Report submitted successfully." };
  } catch (error) {
    if (error instanceof EditorialMutationError) {
      return { error: error.message, fieldErrors: error.fieldErrors };
    }
    return { error: "Failed to submit Adherence Report. Try again." };
  }
}
