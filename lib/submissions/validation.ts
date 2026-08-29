import {
  allowedSubmissionFiles,
  maxSubmissionFileBytes,
} from "@/lib/submissions/constants";
import type {
  AuthorSubmissionDTO,
  SubmissionAuthorInput,
} from "@/lib/submissions/types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const orcidPattern = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i;

export function normalizeKeywords(value: string) {
  return [...new Set(value.split(/[,\n]/).map((item) => item.trim()))].filter(
    Boolean,
  );
}

export function validateDetails(input: {
  title: string;
  abstract: string;
  keywords: string[];
}) {
  const fieldErrors: Record<string, string> = {};
  const title = input.title.trim();
  const abstract = input.abstract.trim();

  if (!title) fieldErrors.title = "Enter the manuscript title.";
  else if (title.length > 300) {
    fieldErrors.title = "Keep the title within 300 characters.";
  }

  if (!abstract) fieldErrors.abstract = "Enter the manuscript abstract.";
  else if (abstract.length > 10_000) {
    fieldErrors.abstract = "Keep the abstract within 10,000 characters.";
  }

  if (input.keywords.length > 8) {
    fieldErrors.keywords = "Add no more than eight keywords.";
  } else if (input.keywords.some((keyword) => keyword.length > 80)) {
    fieldErrors.keywords = "Keep each keyword within 80 characters.";
  }

  return { fieldErrors, valid: Object.keys(fieldErrors).length === 0 };
}

export function validateAuthors(authors: SubmissionAuthorInput[]) {
  const fieldErrors: Record<string, string> = {};

  if (authors.length === 0) {
    fieldErrors.authors = "Add at least one academic author.";
    return { fieldErrors, valid: false };
  }

  if (authors.length > 30) {
    fieldErrors.authors = "A submission can include up to 30 authors.";
  }

  authors.forEach((author, index) => {
    const label = `Author ${index + 1}`;
    if (!author.fullName.trim()) {
      fieldErrors[`author-${index}-name`] = `${label} needs a full name.`;
    } else if (author.fullName.trim().length > 200) {
      fieldErrors[`author-${index}-name`] = `${label}'s name is too long.`;
    }

    if (author.email && !emailPattern.test(author.email.trim())) {
      fieldErrors[`author-${index}-email`] =
        `${label} needs a valid email address.`;
    }

    if (author.orcid && !orcidPattern.test(author.orcid.trim())) {
      fieldErrors[`author-${index}-orcid`] =
        `${label}'s ORCID should look like 0000-0000-0000-0000.`;
    }
  });

  const correspondingCount = authors.filter(
    ({ isCorrespondingAuthor }) => isCorrespondingAuthor,
  ).length;
  if (correspondingCount !== 1) {
    fieldErrors.corresponding =
      "Choose exactly one corresponding author for this submission.";
  }

  return { fieldErrors, valid: Object.keys(fieldErrors).length === 0 };
}

export function validateUploadFile(file: Pick<File, "name" | "size" | "type">) {
  if (file.size === 0) return "Choose a file that is not empty.";
  if (file.size > maxSubmissionFileBytes) {
    return "Choose a file no larger than 20 MB.";
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extensions = allowedSubmissionFiles[
    file.type as keyof typeof allowedSubmissionFiles
  ] as readonly string[] | undefined;

  if (!extensions?.includes(extension)) {
    return "Upload a PDF, DOC, or DOCX file with a matching file extension.";
  }

  return null;
}

export function validateInitialManuscriptFile(
  file: Pick<File, "name" | "size" | "type">,
) {
  if (file.size === 0) return "Choose a file that is not empty.";
  if (file.size > maxSubmissionFileBytes) {
    return "Choose a file no larger than 20 MB.";
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (extension === "pdf" || file.type === "application/pdf") {
    return "Initial manuscript must be a Microsoft Word document (.doc or .docx). PDF is not accepted for initial submission.";
  }

  if (extension !== "doc" && extension !== "docx") {
    return "Initial manuscript must be a Microsoft Word document (.doc or .docx).";
  }

  return null;
}

export function matchesWordUploadSignature(
  mimeType: string,
  bytes: Uint8Array,
  extension?: string,
) {
  const isPkZip =
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08));

  const isOle2Doc =
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0;

  if (extension === "docx" && isPkZip) return true;
  if (extension === "doc" && isOle2Doc) return true;

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
    isPkZip
  ) {
    return true;
  }

  if (
    (mimeType === "application/msword" ||
      mimeType === "application/x-msword" ||
      mimeType === "application/vnd.ms-word" ||
      mimeType === "application/doc") &&
    isOle2Doc
  ) {
    return true;
  }

  if ((extension === "docx" || extension === "doc") && (isPkZip || isOle2Doc)) {
    return true;
  }

  return false;
}

export function matchesUploadSignature(mimeType: string, bytes: Uint8Array) {
  if (mimeType === "application/pdf") {
    return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }
  return matchesWordUploadSignature(mimeType, bytes);
}

export function validateFinalSubmission(submission: AuthorSubmissionDTO) {
  const issues: string[] = [];
  const details = validateDetails({
    title: submission.title ?? "",
    abstract: submission.abstract ?? "",
    keywords: submission.keywords,
  });
  const authors = validateAuthors(submission.authors);

  if (
    !submission.journal.isActive ||
    (submission.journal.department && !submission.journal.department.isActive)
  ) {
    issues.push("The selected journal is no longer accepting submissions.");
  }
  if (!details.valid) issues.push(...Object.values(details.fieldErrors));
  if (!authors.valid) issues.push(...Object.values(authors.fieldErrors));
  if (!submission.files.some(({ type }) => type === "MANUSCRIPT")) {
    issues.push("Upload the manuscript file before submitting.");
  }
  if (
    !submission.declarationAccuracy ||
    !submission.declarationAuthority ||
    !submission.declarationReadiness
  ) {
    issues.push("Complete all three submission declarations.");
  }

  return [...new Set(issues)];
}
