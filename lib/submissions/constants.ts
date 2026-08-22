export const submissionSteps = [
  "journal",
  "details",
  "authors",
  "files",
  "declarations",
  "review",
] as const;

export type SubmissionStep = (typeof submissionSteps)[number];

export const submissionStepLabels: Record<SubmissionStep, string> = {
  journal: "Journal",
  details: "Details",
  authors: "Authors",
  files: "Files",
  declarations: "Declarations",
  review: "Review",
};

export const firstSubmissionFileTypes = [
  "MANUSCRIPT",
  "COVER_LETTER",
  "SUPPLEMENTARY",
] as const;

export type FirstSubmissionFileType = (typeof firstSubmissionFileTypes)[number];

export const submissionFileLabels: Record<FirstSubmissionFileType, string> = {
  MANUSCRIPT: "Manuscript",
  COVER_LETTER: "Cover letter",
  SUPPLEMENTARY: "Supplementary file",
};

export const maxSubmissionFileBytes = 20 * 1024 * 1024;
export const maxSubmissionFileLabel = "20 MB";

export const allowedSubmissionFiles = {
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
} as const;

export function isSubmissionStep(value: string): value is SubmissionStep {
  return submissionSteps.includes(value as SubmissionStep);
}

export function isFirstSubmissionFileType(
  value: string,
): value is FirstSubmissionFileType {
  return firstSubmissionFileTypes.includes(value as FirstSubmissionFileType);
}

export function getNextSubmissionStep(step: SubmissionStep) {
  const index = submissionSteps.indexOf(step);
  return submissionSteps[Math.min(index + 1, submissionSteps.length - 1)];
}
