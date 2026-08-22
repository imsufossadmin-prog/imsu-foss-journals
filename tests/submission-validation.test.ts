import assert from "node:assert/strict";
import test from "node:test";

import { createTrackingNumber } from "@/lib/submissions/tracking";
import type { AuthorSubmissionDTO } from "@/lib/submissions/types";
import {
  normalizeKeywords,
  matchesUploadSignature,
  validateAuthors,
  validateDetails,
  validateFinalSubmission,
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
    /PDF or DOCX/,
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
