import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { isJournalActivated } from "@/lib/editorial/journal-activation";
import {
  createSubmissionObjectPath,
  storageBuckets,
} from "@/lib/storage/paths";
import type { SubmissionAuthorInput } from "@/lib/submissions/types";
import {
  matchesWordUploadSignature,
  normalizeKeywords,
  validateAuthors,
  validateDetails,
  validateInitialManuscriptFile,
} from "@/lib/submissions/validation";
import { createAdminClient } from "@/lib/supabase/admin";

export class DirectSubmissionError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export async function createDirectArticleSubmission(input: {
  authorId: string;
  journalSlug: string;
  title: string;
  abstract: string;
  keywords: string[];
  authors: SubmissionAuthorInput[];
  file: File;
}) {
  const author = await prisma.user.findUnique({
    where: { id: input.authorId },
    select: {
      id: true,
      isActive: true,
      displayName: true,
      globalRoles: { select: { role: true } },
    },
  });

  if (!author || !author.isActive) {
    throw new DirectSubmissionError("Your account is not active.");
  }

  if (!author.globalRoles.some(({ role }) => role === "AUTHOR")) {
    throw new DirectSubmissionError("Only authors can submit manuscripts.");
  }

  const targetSlug = input.journalSlug.trim();
  if (!targetSlug) {
    throw new DirectSubmissionError(
      "Please select a target journal for your submission.",
    );
  }

  const isActivated = await isJournalActivated(targetSlug);
  if (!isActivated) {
    throw new DirectSubmissionError(
      "Submissions for this journal are not currently active.",
    );
  }

  const journal = await prisma.journal.findFirst({
    where: {
      slug: targetSlug,
      isActive: true,
      OR: [{ departmentId: null }, { department: { isActive: true } }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      departmentId: true,
      department: { select: { name: true } },
    },
  });

  if (!journal) {
    throw new DirectSubmissionError("Selected journal is unavailable.");
  }

  const detailsValidation = validateDetails({
    title: input.title,
    abstract: input.abstract,
    keywords: input.keywords,
  });

  const authorsValidation = validateAuthors(input.authors);

  const combinedFieldErrors = {
    ...detailsValidation.fieldErrors,
    ...authorsValidation.fieldErrors,
  };

  if (!detailsValidation.valid || !authorsValidation.valid) {
    throw new DirectSubmissionError(
      "Please correct the highlighted fields before submitting.",
      combinedFieldErrors,
    );
  }

  const fileError = validateInitialManuscriptFile(input.file);
  if (fileError) {
    throw new DirectSubmissionError(fileError, { file: fileError });
  }

  const extension = input.file.name.split(".").pop()?.toLowerCase() ?? "";
  const signature = new Uint8Array(await input.file.slice(0, 8).arrayBuffer());
  if (!matchesWordUploadSignature(input.file.type, signature, extension)) {
    throw new DirectSubmissionError(
      "Uploaded file does not match a valid Microsoft Word document.",
      { file: "Invalid file format." },
    );
  }

  // Upload manuscript to Supabase Storage
  const bucket = storageBuckets.privateAcademicFiles;
  const tempSubmissionId = randomUUID();
  const objectPath = createSubmissionObjectPath({
    journalId: journal.id,
    submissionId: tempSubmissionId,
    originalFileName: input.file.name,
  });

  const supabase = createAdminClient();
  const fileArrayBuffer = await input.file.arrayBuffer();
  const fileBuffer = Buffer.from(fileArrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, fileBuffer, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new DirectSubmissionError(
      `Private file upload failed: ${uploadError.message}. Please try again.`,
    );
  }

  const now = new Date();

  try {
    // 1. Create StoredFile
    const storedFile = await prisma.storedFile.create({
      data: {
        bucket,
        objectPath,
        originalFileName: input.file.name,
        mimeType: input.file.type || "application/octet-stream",
        sizeBytes: BigInt(input.file.size),
        uploaderId: author.id,
      },
      select: { id: true },
    });

    // 2. Create Submission with Authors and File
    const submission = await prisma.submission.create({
      data: {
        journalId: journal.id,
        ownerId: author.id,
        title: input.title.trim(),
        abstract: input.abstract.trim(),
        keywords: normalizeKeywords(input.keywords.join(", ")),
        status: "SUBMITTED",
        version: 1,
        declarationAccuracy: true,
        declarationAuthority: true,
        declarationReadiness: true,
        submittedAt: now,
        authors: {
          create: input.authors.map((authorInput, index) => ({
            fullName: authorInput.fullName.trim(),
            email: authorInput.email?.trim() || null,
            affiliation: authorInput.affiliation?.trim() || null,
            orcid: authorInput.orcid?.trim().toUpperCase() || null,
            position: index + 1,
            isCorrespondingAuthor: authorInput.isCorrespondingAuthor,
          })),
        },
        files: {
          create: {
            storedFileId: storedFile.id,
            type: "MANUSCRIPT",
          },
        },
      },
      select: { id: true, title: true },
    });

    // 3. Create SubmissionVersion
    const version = await prisma.submissionVersion.create({
      data: {
        submissionId: submission.id,
        versionNumber: 1,
        kind: "ORIGINAL",
        manuscriptStoredFileId: storedFile.id,
        submittedAt: now,
      },
      select: { id: true },
    });

    // 4. Create SubmissionEvent
    await prisma.submissionEvent.create({
      data: {
        submissionId: submission.id,
        submissionVersionId: version.id,
        type: "SUBMISSION_RECEIVED",
        actorId: author.id,
        authorVisible: true,
        createdAt: now,
      },
    });

    // 5. Create linked SubmissionRequest with initial system message
    const journalLabel = journal.department?.name ?? journal.name;
    await prisma.submissionRequest.create({
      data: {
        journalId: journal.id,
        departmentId: journal.departmentId,
        authorId: author.id,
        submissionId: submission.id,
        status: "SUBMISSION_ENABLED",
        submissionEnabledAt: now,
        messages: {
          create: {
            kind: "SYSTEM",
            body: `Manuscript "${submission.title}" submitted. The ${journalLabel} editorial team can now assist you here.`,
          },
        },
      },
    });

    return { submissionId: submission.id };
  } catch (err: unknown) {
    // Cleanup uploaded storage file if DB write fails
    await supabase.storage.from(bucket).remove([objectPath]);
    if (err instanceof DirectSubmissionError) throw err;
    const message =
      err instanceof Error
        ? err.message
        : "Failed to create direct manuscript submission.";
    throw new DirectSubmissionError(message);
  }
}
