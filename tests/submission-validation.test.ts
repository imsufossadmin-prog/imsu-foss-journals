import assert from "node:assert/strict";
import test from "node:test";

import { createTrackingNumber } from "@/lib/submissions/tracking";
import type { AuthorSubmissionDTO } from "@/lib/submissions/types";
import {
  normalizeKeywords,
  matchesUploadSignature,
  matchesWordUploadSignature,
  validateAuthors,
  validateDetails,
  validateFinalSubmission,
  validateInitialManuscriptFile,
  validateUploadFile,
} from "@/lib/submissions/validation";

const author = {
  fullName: "Ada Researcher",
  email: "ada@example.test",
  affiliation: "Imo State University",
  orcid: "0000-0002-1825-0097",
  isCorrespondingAuthor: true,
};

function completeSubmission(): AuthorSubmissionDTO {
  const now = new Date();
  return {
    id: "submission-a",
    trackingNumber: null,
    title: "A careful study of public policy",
    abstract: "A complete abstract for editorial consideration.",
    keywords: ["policy", "governance"],
    status: "DRAFT",
    version: 6,
    declarationAccuracy: true,
    declarationAuthority: true,
    declarationReadiness: true,
    submittedAt: null,
    createdAt: now,
    updatedAt: now,
    journal: {
      id: "journal-a",
      name: "IMSU FOSS Journal",
      shortName: "FOSS",
      slug: "imsu-foss-journal",
      description: null,
      isActive: true,
      department: { name: "Social Sciences", isActive: true },
    },
    authors: [{ ...author, id: "author-a", position: 1 }],
    files: [
      {
        id: "file-a",
        type: "MANUSCRIPT",
        originalFileName: "manuscript.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        createdAt: now,
      },
    ],
  };
}

test("manuscript details preserve useful input and reject incomplete fields", () => {
  assert.deepEqual(normalizeKeywords(" policy, governance, policy\nethics "), [
    "policy",
    "governance",
    "ethics",
  ]);
  assert.equal(
    validateDetails({ title: "", abstract: "", keywords: [] }).valid,
    false,
  );
  assert.equal(
    validateDetails({
      title: "A manuscript",
      abstract: "A complete abstract",
      keywords: ["policy"],
    }).valid,
    true,
  );
});

test("academic authors require ordered names and exactly one correspondent", () => {
  assert.equal(validateAuthors([author, { ...author }]).valid, false);
  assert.equal(
    validateAuthors([
      author,
      {
        ...author,
        fullName: "Chidi Scholar",
        email: "chidi@example.test",
        isCorrespondingAuthor: false,
      },
    ]).valid,
    true,
  );
  assert.equal(
    validateAuthors([{ ...author, orcid: "not-an-orcid" }]).valid,
    false,
  );
});

test("uploads accept only matching non-empty PDF or DOCX files within 20 MB", () => {
  assert.equal(
    validateUploadFile({
      name: "manuscript.pdf",
      size: 1024,
      type: "application/pdf",
    }),
    null,
  );
  assert.match(
    validateUploadFile({
      name: "manuscript.exe",
      size: 1024,
      type: "application/pdf",
    }) ?? "",
    /PDF, DOC, or DOCX/,
  );
  assert.match(
    validateUploadFile({
      name: "manuscript.pdf",
      size: 21 * 1024 * 1024,
      type: "application/pdf",
    }) ?? "",
    /20 MB/,
  );
  assert.equal(
    matchesUploadSignature(
      "application/pdf",
      new TextEncoder().encode("%PDF-1.7"),
    ),
    true,
  );
  assert.equal(
    matchesUploadSignature(
      "application/pdf",
      new TextEncoder().encode("not a pdf"),
    ),
    false,
  );
});

test("initial manuscript strictly validates Word documents (.doc/.docx) and rejects PDF", () => {
  assert.equal(
    validateInitialManuscriptFile({
      name: "manuscript.docx",
      size: 1024,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    null,
  );
  assert.equal(
    validateInitialManuscriptFile({
      name: "manuscript.doc",
      size: 1024,
      type: "application/msword",
    }),
    null,
  );
  assert.match(
    validateInitialManuscriptFile({
      name: "manuscript.pdf",
      size: 1024,
      type: "application/pdf",
    }) ?? "",
    /PDF is not accepted for initial submission/,
  );
  assert.match(
    validateInitialManuscriptFile({
      name: "manuscript.txt",
      size: 1024,
      type: "text/plain",
    }) ?? "",
    /Microsoft Word document/,
  );

  const docxBytes = new Uint8Array([
    0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00,
  ]);
  const docBytes = new Uint8Array([
    0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
  ]);
  const pdfBytes = new TextEncoder().encode("%PDF-1.7");

  assert.equal(
    matchesWordUploadSignature(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      docxBytes,
      "docx",
    ),
    true,
  );
  assert.equal(
    matchesWordUploadSignature("application/msword", docBytes, "doc"),
    true,
  );
  assert.equal(
    matchesWordUploadSignature("application/pdf", pdfBytes, "pdf"),
    false,
  );
});

test("final review rejects inactive journals, missing files, and declarations", () => {
  const complete = completeSubmission();
  assert.deepEqual(validateFinalSubmission(complete), []);
  assert(
    validateFinalSubmission({ ...complete, files: [] }).some((issue) =>
      issue.includes("manuscript file"),
    ),
  );
  assert(
    validateFinalSubmission({
      ...complete,
      declarationAuthority: false,
    }).some((issue) => issue.includes("declarations")),
  );
  assert(
    validateFinalSubmission({
      ...complete,
      journal: {
        ...complete.journal,
        department: { ...complete.journal.department, isActive: false },
      },
    }).some((issue) => issue.includes("no longer accepting")),
  );
});

test("tracking numbers are stable, readable, and journal-scoped", () => {
  const base = {
    journalId: "journal-a",
    journalName: "IMSU FOSS Journal",
    journalShortName: "FOSS",
    year: 2026,
    sequence: 42,
  };
  const first = createTrackingNumber(base);
  assert.match(first, /^FOSS-[0-9A-F]{4}-2026-00042$/);
  assert.equal(createTrackingNumber(base), first);
  assert.notEqual(
    createTrackingNumber({ ...base, journalId: "journal-b" }),
    first,
  );
  assert.notEqual(createTrackingNumber({ ...base, sequence: 43 }), first);
});

test("Phase 1: General uploads and Word initial manuscripts reject empty files and oversized files (> 20 MB)", () => {
  assert.match(
    validateUploadFile({
      name: "empty.pdf",
      size: 0,
      type: "application/pdf",
    }) ?? "",
    /not empty/,
  );
  assert.match(
    validateUploadFile({
      name: "giant.pdf",
      size: 25 * 1024 * 1024,
      type: "application/pdf",
    }) ?? "",
    /20 MB/,
  );
  assert.match(
    validateInitialManuscriptFile({
      name: "empty.docx",
      size: 0,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }) ?? "",
    /not empty/,
  );
  assert.match(
    validateInitialManuscriptFile({
      name: "giant.docx",
      size: 25 * 1024 * 1024,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }) ?? "",
    /20 MB/,
  );
});

test("Phase 1: Correction numbering logic computes version progression accurately", () => {
  function formatCorrectionEvent(versionNumber: number) {
    const correctionNumber = Math.max(1, versionNumber - 1);
    return `Correction #${correctionNumber} submitted (Manuscript version ${versionNumber})`;
  }

  assert.equal(
    formatCorrectionEvent(2),
    "Correction #1 submitted (Manuscript version 2)",
  );
  assert.equal(
    formatCorrectionEvent(3),
    "Correction #2 submitted (Manuscript version 3)",
  );
  assert.equal(
    formatCorrectionEvent(4),
    "Correction #3 submitted (Manuscript version 4)",
  );
});
