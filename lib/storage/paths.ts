import { randomUUID } from "node:crypto";

export const storageBuckets = {
  privateAcademicFiles: "academic-private",
  publishedArticleFiles: "published-articles",
} as const;

function safeExtension(originalFileName: string) {
  const extension = originalFileName.split(".").pop()?.toLowerCase();

  return extension?.match(/^[a-z0-9]{1,10}$/) ? `.${extension}` : "";
}

export function createSubmissionObjectPath(input: {
  journalId: string;
  submissionId: string;
  originalFileName: string;
}) {
  return `journal/${input.journalId}/submission/${input.submissionId}/${randomUUID()}${safeExtension(input.originalFileName)}`;
}

export function createRequestObjectPath(input: {
  departmentId: string;
  requestId: string;
  originalFileName: string;
}) {
  return `department/${input.departmentId}/request/${input.requestId}/${randomUUID()}${safeExtension(input.originalFileName)}`;
}

export function createArticleObjectPath(input: {
  journalId: string;
  articleId: string;
  originalFileName: string;
}) {
  return `journal/${input.journalId}/article/${input.articleId}/${randomUUID()}${safeExtension(input.originalFileName)}`;
}
