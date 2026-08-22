import "server-only";

import {
  requireJournalRole,
  requireSubmissionOwner,
  requireSubmissionFileAccess,
} from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import {
  createArticleObjectPath,
  createSubmissionObjectPath,
  storageBuckets,
} from "@/lib/storage/paths";
import { createClient } from "@/lib/supabase/server";

export async function createSubmissionFileDownloadUrl(
  submissionFileId: string,
  expectedSubmissionId?: string,
) {
  const submissionFile = await prisma.submissionFile.findUnique({
    where: { id: submissionFileId },
    select: {
      submissionId: true,
      type: true,
      storedFile: { select: { bucket: true, objectPath: true } },
    },
  });

  if (!submissionFile) throw new Error("Submission file not found.");
  if (
    expectedSubmissionId &&
    submissionFile.submissionId !== expectedSubmissionId
  ) {
    throw new Error("Submission file not found.");
  }

  await requireSubmissionFileAccess(
    submissionFile.submissionId,
    submissionFile.type,
  );

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(submissionFile.storedFile.bucket)
    .createSignedUrl(submissionFile.storedFile.objectPath, 60);

  if (error) throw error;

  return data.signedUrl;
}

export async function createSubmissionUploadUrl(input: {
  submissionId: string;
  originalFileName: string;
}) {
  const { submission } = await requireSubmissionOwner(input.submissionId);
  const objectPath = createSubmissionObjectPath({
    journalId: submission.journalId,
    submissionId: submission.id,
    originalFileName: input.originalFileName,
  });
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(storageBuckets.privateAcademicFiles)
    .createSignedUploadUrl(objectPath, { upsert: false });

  if (error) throw error;

  return { ...data, bucket: storageBuckets.privateAcademicFiles, objectPath };
}

export async function createPublishedArticleUploadUrl(input: {
  articleId: string;
  originalFileName: string;
}) {
  const article = await prisma.article.findUnique({
    where: { id: input.articleId },
    select: {
      id: true,
      issue: { select: { volume: { select: { journalId: true } } } },
    },
  });

  if (!article) throw new Error("Article not found.");

  const journalId = article.issue.volume.journalId;
  await requireJournalRole(journalId, "JOURNAL_ADMIN");

  const objectPath = createArticleObjectPath({
    journalId,
    articleId: article.id,
    originalFileName: input.originalFileName,
  });
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(storageBuckets.publishedArticleFiles)
    .createSignedUploadUrl(objectPath, { upsert: false });

  if (error) throw error;

  return { ...data, bucket: storageBuckets.publishedArticleFiles, objectPath };
}
