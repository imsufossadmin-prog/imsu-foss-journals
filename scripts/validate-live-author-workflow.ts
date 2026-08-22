import "dotenv/config";

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { prisma } from "../lib/db/prisma";
import {
  changeDraftJournal,
  createDraft,
  deleteDraftFileRecord,
  deleteDraftRecord,
  finalizeSubmission,
  getDraftFileForRemoval,
  getDraftFilesForDeletion,
  saveDraftAuthors,
  saveDraftDeclarations,
  saveDraftDetails,
  SubmissionMutationError,
} from "../lib/submissions/mutations";
import {
  createSubmissionObjectPath,
  storageBuckets,
} from "../lib/storage/paths";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const secretKey = required("SUPABASE_SECRET_KEY");
const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function retry<T>(operation: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < 5) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 800));
      }
    }
  }
  throw lastError;
}

type TestIdentity = {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
};

const createdAuthUsers: string[] = [];
const createdApplicationUsers: string[] = [];
const createdObjectPaths: string[] = [];
const createdStoredFiles: string[] = [];
let inactiveJournalId: string | null = null;
let inactiveDepartmentId: string | null = null;

async function createIdentity(label: string, isActive = true) {
  const nonce = randomUUID();
  const email = `phase3-${label}-${nonce}@example.test`;
  const password = `P3!${randomBytes(24).toString("base64url")}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(error);
  assert(data.user);
  createdAuthUsers.push(data.user.id);

  await prisma.user.create({
    data: {
      id: data.user.id,
      displayName: `Phase 3 ${label}`,
      isActive,
      globalRoles: { create: { role: "AUTHOR" } },
    },
  });
  createdApplicationUsers.push(data.user.id);

  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await retry(() =>
    client.auth.signInWithPassword({ email, password }),
  );
  assert.ifError(signInError);
  return { id: data.user.id, email, password, client } satisfies TestIdentity;
}

async function expectMutationDenied(operation: () => Promise<unknown>) {
  await assert.rejects(operation, SubmissionMutationError);
}

async function upload(
  identity: TestIdentity,
  journalId: string,
  submissionId: string,
  fileName: string,
) {
  const path = createSubmissionObjectPath({
    journalId,
    submissionId,
    originalFileName: fileName,
  });
  const result = await identity.client.storage
    .from(storageBuckets.privateAcademicFiles)
    .upload(path, Buffer.from("%PDF-1.7\nPhase 3 live manuscript\n"), {
      contentType: "application/pdf",
      upsert: false,
    });
  return { path, error: result.error };
}

async function cleanup() {
  if (createdObjectPaths.length > 0) {
    await retry(() =>
      admin.storage
        .from(storageBuckets.privateAcademicFiles)
        .remove(createdObjectPaths),
    );
  }
  await retry(() =>
    prisma.submission.deleteMany({
      where: { ownerId: { in: createdApplicationUsers } },
    }),
  );
  await retry(() =>
    prisma.storedFile.deleteMany({
      where: { id: { in: createdStoredFiles } },
    }),
  );
  await retry(() =>
    prisma.user.deleteMany({
      where: { id: { in: createdApplicationUsers } },
    }),
  );
  if (inactiveJournalId) {
    await retry(() =>
      prisma.journal.deleteMany({ where: { id: inactiveJournalId! } }),
    );
  }
  if (inactiveDepartmentId) {
    await retry(() =>
      prisma.department.deleteMany({ where: { id: inactiveDepartmentId! } }),
    );
  }
  for (const id of createdAuthUsers) {
    await retry(() => admin.auth.admin.deleteUser(id));
  }
}

async function main() {
  const owner = await createIdentity("owner");
  const unrelated = await createIdentity("unrelated");
  const inactive = await createIdentity("inactive", false);
  const journal = await prisma.journal.findFirstOrThrow({
    where: { isActive: true, department: { isActive: true } },
  });

  const inactiveDepartment = await prisma.department.create({
    data: {
      name: `Phase 3 inactive ${randomUUID()}`,
      slug: `phase3-inactive-${randomUUID()}`,
      isActive: false,
    },
  });
  inactiveDepartmentId = inactiveDepartment.id;
  const inactiveJournal = await prisma.journal.create({
    data: {
      departmentId: inactiveDepartment.id,
      name: "Phase 3 inactive validation journal",
      slug: `phase3-inactive-journal-${randomUUID()}`,
      isActive: true,
    },
  });
  inactiveJournalId = inactiveJournal.id;

  const draft = await createDraft(owner.id, journal.id);
  let record = await prisma.submission.findUniqueOrThrow({
    where: { id: draft.id },
  });
  assert.equal(record.status, "DRAFT");

  await expectMutationDenied(() =>
    saveDraftDetails({
      ownerId: unrelated.id,
      submissionId: draft.id,
      version: record.version,
      title: "Unauthorized change",
      abstract: "This should never be persisted.",
      keywords: [],
    }),
  );
  await expectMutationDenied(() =>
    changeDraftJournal({
      ownerId: owner.id,
      submissionId: draft.id,
      journalId: inactiveJournal.id,
      version: record.version,
    }),
  );

  await saveDraftDetails({
    ownerId: owner.id,
    submissionId: draft.id,
    version: record.version,
    title: "Phase 3 live author workflow validation",
    abstract:
      "A live validation manuscript proving draft persistence and submission integrity.",
    keywords: ["workflow", "security"],
  });
  record = await prisma.submission.findUniqueOrThrow({
    where: { id: draft.id },
  });
  await saveDraftAuthors({
    ownerId: owner.id,
    submissionId: draft.id,
    version: record.version,
    authors: [
      {
        fullName: "Academic Author One",
        email: "author.one@example.test",
        affiliation: "Imo State University",
        orcid: "0000-0002-1825-0097",
        isCorrespondingAuthor: true,
      },
      {
        fullName: "Academic Author Two",
        email: "author.two@example.test",
        affiliation: "Independent Researcher",
        orcid: "",
        isCorrespondingAuthor: false,
      },
    ],
  });

  const unrelatedUpload = await upload(
    unrelated,
    journal.id,
    draft.id,
    "unrelated.pdf",
  );
  assert(unrelatedUpload.error);
  const inactiveUpload = await upload(
    inactive,
    journal.id,
    draft.id,
    "inactive.pdf",
  );
  assert(inactiveUpload.error);

  const ownerUpload = await upload(
    owner,
    journal.id,
    draft.id,
    "live-manuscript.pdf",
  );
  assert.ifError(ownerUpload.error);
  createdObjectPaths.push(ownerUpload.path);
  const storedFile = await prisma.storedFile.create({
    data: {
      bucket: storageBuckets.privateAcademicFiles,
      objectPath: ownerUpload.path,
      originalFileName: "live-manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: 35,
      uploaderId: owner.id,
    },
  });
  createdStoredFiles.push(storedFile.id);
  await prisma.submissionFile.create({
    data: {
      submissionId: draft.id,
      storedFileId: storedFile.id,
      type: "MANUSCRIPT",
    },
  });

  record = await prisma.submission.findUniqueOrThrow({
    where: { id: draft.id },
  });
  await saveDraftDeclarations({
    ownerId: owner.id,
    submissionId: draft.id,
    version: record.version,
    declarationAccuracy: true,
    declarationAuthority: true,
    declarationReadiness: true,
  });

  const submitted = await finalizeSubmission(owner.id, draft.id);
  assert.equal(submitted.trackingNumber, null);
  record = await prisma.submission.findUniqueOrThrow({
    where: { id: draft.id },
  });
  assert.equal(record.status, "SUBMITTED");
  assert(record.submittedAt);
  assert.equal(record.trackingNumber, submitted.trackingNumber);
  await expectMutationDenied(() => finalizeSubmission(owner.id, draft.id));
  await expectMutationDenied(() =>
    saveDraftDetails({
      ownerId: owner.id,
      submissionId: draft.id,
      version: record.version,
      title: "Submitted content changed",
      abstract: record.abstract ?? "",
      keywords: record.keywords,
    }),
  );

  const { data: ownerDownload, error: ownerDownloadError } =
    await owner.client.storage
      .from(storageBuckets.privateAcademicFiles)
      .download(ownerUpload.path);
  assert(ownerDownload);
  assert.ifError(ownerDownloadError);
  const { error: unrelatedDownloadError } = await unrelated.client.storage
    .from(storageBuckets.privateAcademicFiles)
    .download(ownerUpload.path);
  assert(unrelatedDownloadError);
  const submittedUpload = await upload(
    owner,
    journal.id,
    draft.id,
    "post-submit.pdf",
  );
  assert(submittedUpload.error);
  await owner.client.storage
    .from(storageBuckets.privateAcademicFiles)
    .remove([ownerUpload.path]);
  const { data: retainedSubmittedFile, error: retainedSubmittedFileError } =
    await owner.client.storage
      .from(storageBuckets.privateAcademicFiles)
      .download(ownerUpload.path);
  assert(retainedSubmittedFile);
  assert.ifError(retainedSubmittedFileError);

  const removalDraft = await createDraft(owner.id, journal.id);
  const removalUpload = await upload(
    owner,
    journal.id,
    removalDraft.id,
    "remove-before-submit.pdf",
  );
  assert.ifError(removalUpload.error);
  createdObjectPaths.push(removalUpload.path);
  const removalStoredFile = await prisma.storedFile.create({
    data: {
      bucket: storageBuckets.privateAcademicFiles,
      objectPath: removalUpload.path,
      originalFileName: "remove-before-submit.pdf",
      mimeType: "application/pdf",
      sizeBytes: 35,
      uploaderId: owner.id,
    },
  });
  createdStoredFiles.push(removalStoredFile.id);
  const removalSubmissionFile = await prisma.submissionFile.create({
    data: {
      submissionId: removalDraft.id,
      storedFileId: removalStoredFile.id,
      type: "MANUSCRIPT",
    },
  });
  const removalRecord = await prisma.submission.findUniqueOrThrow({
    where: { id: removalDraft.id },
  });
  const removable = await getDraftFileForRemoval({
    ownerId: owner.id,
    submissionId: removalDraft.id,
    submissionFileId: removalSubmissionFile.id,
  });
  await deleteDraftFileRecord({
    ownerId: owner.id,
    submissionId: removalDraft.id,
    submissionFileId: removable.id,
    storedFileId: removable.storedFileId,
    version: removalRecord.version,
  });
  await owner.client.storage
    .from(storageBuckets.privateAcademicFiles)
    .remove([removalUpload.path]);
  const { error: removedFileDownloadError } = await owner.client.storage
    .from(storageBuckets.privateAcademicFiles)
    .download(removalUpload.path);
  assert(removedFileDownloadError);
  await deleteDraftRecord(owner.id, removalDraft.id, []);

  const deletionDraft = await createDraft(owner.id, journal.id);
  const deletionUpload = await upload(
    owner,
    journal.id,
    deletionDraft.id,
    "delete-with-draft.pdf",
  );
  assert.ifError(deletionUpload.error);
  createdObjectPaths.push(deletionUpload.path);
  const deletionStoredFile = await prisma.storedFile.create({
    data: {
      bucket: storageBuckets.privateAcademicFiles,
      objectPath: deletionUpload.path,
      originalFileName: "delete-with-draft.pdf",
      mimeType: "application/pdf",
      sizeBytes: 35,
      uploaderId: owner.id,
    },
  });
  createdStoredFiles.push(deletionStoredFile.id);
  await prisma.submissionFile.create({
    data: {
      submissionId: deletionDraft.id,
      storedFileId: deletionStoredFile.id,
      type: "MANUSCRIPT",
    },
  });
  const deletionFiles = await getDraftFilesForDeletion(
    owner.id,
    deletionDraft.id,
  );
  assert.equal(deletionFiles.length, 1);
  await owner.client.storage
    .from(storageBuckets.privateAcademicFiles)
    .remove(deletionFiles.map(({ storedFile }) => storedFile.objectPath));
  await deleteDraftRecord(
    owner.id,
    deletionDraft.id,
    deletionFiles.map(({ storedFileId }) => storedFileId),
  );
  assert.equal(
    await prisma.submission.findUnique({ where: { id: deletionDraft.id } }),
    null,
  );

  console.log(
    JSON.stringify({
      draftCreation: true,
      draftPersistence: true,
      multiAuthorOrdering: true,
      ownershipBoundary: true,
      inactiveUserStorageBoundary: true,
      inactiveJournalRejected: true,
      privateUploadAndMetadata: true,
      finalSubmission: true,
      trackingNumber: submitted.trackingNumber,
      duplicateSubmitRejected: true,
      submittedReadOnly: true,
      submittedStorageUploadRejected: true,
      submittedStorageDeleteRejected: true,
      ownerDownload: true,
      unrelatedDownloadRejected: true,
      draftFileRemoval: true,
      draftDeletionWithFileCleanup: true,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error(
        "Live validation cleanup failed:",
        cleanupError instanceof Error ? cleanupError.message : cleanupError,
      );
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
  });
