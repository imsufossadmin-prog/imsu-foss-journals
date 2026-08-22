import type { PrismaClient } from "@prisma/client";

export function findOwnedSubmission(
  database: PrismaClient,
  userId: string,
  submissionId: string,
) {
  return database.submission.findFirst({
    where: { id: submissionId, ownerId: userId },
  });
}

export function findActiveEditorAssignment(
  database: PrismaClient,
  editorId: string,
  submissionId: string,
) {
  return database.reviewAssignment.findFirst({
    where: {
      editorId,
      status: { notIn: ["DECLINED", "CANCELLED"] },
      reviewRound: { submissionId },
    },
  });
}
