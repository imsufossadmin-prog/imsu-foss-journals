import type {
  EditorialDecisionType,
  ReviewRecommendation,
} from "@prisma/client";

export const minimumCompletedReviews = 2;

export const scorecardDimensions = [
  { key: "titleAbstract", label: "Title and Abstract" },
  { key: "introductionThesis", label: "Introduction and Thesis Statement" },
  { key: "literatureReview", label: "Literature Review" },
  { key: "methodology", label: "Methodology" },
  { key: "resultsDiscussion", label: "Results and Discussion" },
  { key: "conclusion", label: "Conclusion" },
  { key: "languageStyle", label: "Grammatical and Stylistic Review" },
  { key: "apaAdherence", label: "Adherence to APA 7th Edition" },
] as const;

export const reviewDimensions = scorecardDimensions.map((d) => d.key);

export type ScorecardDimensionKey = (typeof scorecardDimensions)[number]["key"];

export type ReviewFormInput = {
  titleAbstract: number;
  introductionThesis: number;
  literatureReview: number;
  methodology: number;
  resultsDiscussion: number;
  conclusion: number;
  languageStyle: number;
  apaAdherence: number;
  generalReport: string;
  commentsToAuthor?: string;
  confidentialComments?: string;
  recommendation: ReviewRecommendation | "";
};

export function calculateAverageScore(
  input: Record<ScorecardDimensionKey, number>,
): number {
  const scores = scorecardDimensions
    .map((d) => input[d.key])
    .filter((s) => typeof s === "number" && s > 0);
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => sum + s, 0);
  return Number((total / scores.length).toFixed(1));
}

export function validateReview(input: ReviewFormInput, _final: boolean) {
  const fieldErrors: Record<string, string> = {};
  for (const dimension of scorecardDimensions) {
    const score = input[dimension.key];
    if (
      score !== undefined &&
      score !== null &&
      score !== 0 &&
      (!Number.isInteger(score) || score < 1 || score > 10)
    ) {
      fieldErrors[dimension.key] = "Choose a score from 1 to 10.";
    }
  }
  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

export const adherenceOutcomes = [
  "ADHERED",
  "PARTIALLY_ADHERED",
  "DID_NOT_ADHERE",
] as const;
export type AdherenceOutcomeType = (typeof adherenceOutcomes)[number];

export const adherenceOutcomeLabels: Record<AdherenceOutcomeType, string> = {
  ADHERED: "Adhered",
  PARTIALLY_ADHERED: "Partially Adhered",
  DID_NOT_ADHERE: "Did Not Adhere",
};

export type AdherenceReportFormInput = {
  outcome: AdherenceOutcomeType | "";
  report: string;
};

export function validateAdherenceReport(input: AdherenceReportFormInput) {
  const fieldErrors: Record<string, string> = {};
  if (
    !input.outcome ||
    !adherenceOutcomes.includes(input.outcome as AdherenceOutcomeType)
  ) {
    fieldErrors.outcome = "Select a valid adherence outcome.";
  }
  if (!input.report.trim()) {
    fieldErrors.report = "Provide your adherence evaluation report.";
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
