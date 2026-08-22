import type {
  EditorialDecisionType,
  ReviewRecommendation,
} from "@prisma/client";

export const minimumCompletedReviews = 2;
export const reviewDimensions = [
  "originality",
  "methodology",
  "clarity",
  "relevance",
] as const;

export type ReviewFormInput = {
  originality: number;
  methodology: number;
  clarity: number;
  relevance: number;
  commentsToAuthor: string;
  confidentialComments: string;
  recommendation: ReviewRecommendation | "";
};

export function validateReview(input: ReviewFormInput, final: boolean) {
  const fieldErrors: Record<string, string> = {};
  for (const dimension of reviewDimensions) {
    const score = input[dimension];
    if (
      (final || score !== 0) &&
      (!Number.isInteger(score) || score < 1 || score > 5)
    ) {
      fieldErrors[dimension] = "Choose a score from 1 to 5.";
    }
  }
  if (final && !input.commentsToAuthor.trim()) {
    fieldErrors.commentsToAuthor = "Add constructive comments for the author.";
  }
  if (final && !input.recommendation) {
    fieldErrors.recommendation = "Choose a recommendation.";
  }
  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

export function decisionSubmissionStatus(type: EditorialDecisionType) {
  if (type === "ACCEPT") return "ACCEPTED" as const;
  if (type === "REJECT") return "REJECTED" as const;
  return "REVISION_REQUESTED" as const;
}

export function isRevisionDecision(type: EditorialDecisionType) {
  return type === "MINOR_REVISION" || type === "MAJOR_REVISION";
}

export function safeAuthorReview<
  T extends {
    commentsToAuthor: string | null;
    recommendation: ReviewRecommendation | null;
  },
>(review: T) {
  return {
    commentsToAuthor: review.commentsToAuthor,
    recommendation: review.recommendation,
  };
}

export function hasBlindIdentityLeak(value: unknown) {
  const serialized = JSON.stringify(value).toLowerCase();
  return [
    "ownerid",
    "authors",
    "uploaderid",
    "originalfilename",
    "email",
    "displayname",
  ].some((field) => serialized.includes(`\"${field}\"`));
}
