import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { prisma } from "../lib/db/prisma";
import {
  getAuthorEditorialHistory,
  getBlindedAssignment,
  getEditorialSubmission,
  listEditorialSubmissions,
} from "../lib/editorial/data";
import {
  assignReviewer,
  beginInitialAssessment,
  issueEditorialDecision,
  passInitialAssessment,
  recordRevision,
  saveEditorReview,
} from "../lib/editorial/mutations";
import { hasBlindIdentityLeak } from "../lib/editorial/validation";
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
const service = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const runId = randomUUID();
const password = `P4-${randomUUID()}aA!`;
const authUserIds: string[] = [];
const storedFileIds: string[] = [];
const objectPaths: string[] = [];
let submissionId: string | null = null;

async function retry<T>(work: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
  }
  throw lastError;
}

function publicClient() {
  return createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function identity(label: string) {
  const email = `phase4-${label}-${runId}@example.test`;
  const { data, error } = await retry(() =>
    service.auth.admin.createUser({ email, password, email_confirm: true }),
  );
  assert.ifError(error);
  assert(data.user);
  authUserIds.push(data.user.id);
  const client = publicClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  assert.ifError(signedIn.error);
  return { id: data.user.id, client };
}

async function canDownload(
  client: ReturnType<typeof publicClient>,
  path: string,
) {
  const { data, error } = await client.storage
    .from(storageBuckets.privateAcademicFiles)
    .download(path);
  return Boolean(data) && !error;
}

async function upload(
  client: ReturnType<typeof publicClient>,
  path: string,
  body: string,
) {
  const { error } = await client.storage
    .from(storageBuckets.privateAcademicFiles)
    .upload(path, Buffer.from(body), { contentType: "application/pdf" });
  assert.ifError(error);
  objectPaths.push(path);
}

async function expectDenied(operation: () => Promise<unknown>) {
  await assert.rejects(operation);
}

async function cleanup() {
  if (submissionId) {
    await prisma.submission.deleteMany({ where: { id: submissionId } });
  }
  if (storedFileIds.length) {
    await prisma.storedFile.deleteMany({
      where: { id: { in: storedFileIds } },
    });
  }
  if (objectPaths.length) {
    await service.storage
      .from(storageBuckets.privateAcademicFiles)
      .remove(objectPaths);
  }
  if (authUserIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: authUserIds } } });
  }
  for (const id of authUserIds) {
    await service.auth.admin.deleteUser(id);
  }
}

async function main() {
  console.log("Live Phase 4 validation started.");
  const [psychology, secondaryJournal] = await Promise.all([
    prisma.journal.findUniqueOrThrow({ where: { slug: "psychology" } }),
    prisma.journal.findUniqueOrThrow({
      where: { slug: "imsu-foss-development-journal" },
    }),
  ]);
  const administrator = await identity("admin");
  const editorOne = await identity("editor-one");
  const editorTwo = await identity("editor-two");
  const crossEditor = await identity("cross-editor");
  const author = await identity("author");
  await prisma.user.createMany({
    data: [
      { id: administrator.id, displayName: "Phase 4 Administrator" },
      { id: editorOne.id, displayName: "Phase 4 Reviewer One" },
      { id: editorTwo.id, displayName: "Phase 4 Reviewer Two" },
      { id: crossEditor.id, displayName: "Phase 4 Cross Journal Reviewer" },
      { id: author.id, displayName: "Phase 4 Author" },
    ],
  });
  await Promise.all([
    prisma.journalRoleAssignment.create({
      data: {
        userId: administrator.id,
        journalId: psychology.id,
        role: "JOURNAL_ADMIN",
      },
    }),
    prisma.journalRoleAssignment.create({
      data: { userId: editorOne.id, journalId: psychology.id, role: "EDITOR" },
    }),
    prisma.journalRoleAssignment.create({
      data: { userId: editorTwo.id, journalId: psychology.id, role: "EDITOR" },
    }),
    prisma.journalRoleAssignment.create({
      data: {
        userId: crossEditor.id,
        journalId: secondaryJournal.id,
        role: "EDITOR",
      },
    }),
    prisma.userGlobalRole.create({
      data: { userId: author.id, role: "AUTHOR" },
    }),
  ]);

  const submission = await prisma.submission.create({
    data: {
      journalId: psychology.id,
      ownerId: author.id,
      trackingNumber: `PSYCHOLOGY-P4-${runId}`,
      title: "Live validation of double-blind editorial review",
      abstract:
        "A temporary manuscript used to verify the complete Phase 4 lifecycle.",
      keywords: ["peer review", "editorial workflow"],
      status: "DRAFT",
      declarationAccuracy: true,
      declarationAuthority: true,
      declarationReadiness: true,
    },
  });
  submissionId = submission.id;
  await prisma.submissionAuthor.create({
    data: {
      submissionId: submission.id,
      fullName: "Confidential Validation Author",
      email: "confidential@example.test",
      position: 1,
      isCorrespondingAuthor: true,
    },
  });
  const manuscriptPath = createSubmissionObjectPath({
    journalId: psychology.id,
    submissionId: submission.id,
    originalFileName: "anonymous-manuscript.pdf",
  });
  const coverPath = createSubmissionObjectPath({
    journalId: psychology.id,
    submissionId: submission.id,
    originalFileName: "identity-cover-letter.pdf",
  });
  await upload(author.client, manuscriptPath, "%PDF-1.4 anonymous manuscript");
  await upload(author.client, coverPath, "%PDF-1.4 confidential cover letter");
  const [manuscriptStored, coverStored] = await Promise.all([
    prisma.storedFile.create({
      data: {
        bucket: storageBuckets.privateAcademicFiles,
        objectPath: manuscriptPath,
        originalFileName: "anonymous-manuscript.pdf",
        mimeType: "application/pdf",
        sizeBytes: 30,
        uploaderId: author.id,
      },
    }),
    prisma.storedFile.create({
      data: {
        bucket: storageBuckets.privateAcademicFiles,
        objectPath: coverPath,
        originalFileName: "identity-cover-letter.pdf",
        mimeType: "application/pdf",
        sizeBytes: 30,
        uploaderId: author.id,
      },
    }),
  ]);
  storedFileIds.push(manuscriptStored.id, coverStored.id);
  const originalVersion = await prisma.$transaction(async (transaction) => {
    await transaction.submissionFile.createMany({
      data: [
        {
          submissionId: submission.id,
          storedFileId: manuscriptStored.id,
          type: "MANUSCRIPT",
        },
        {
          submissionId: submission.id,
          storedFileId: coverStored.id,
          type: "COVER_LETTER",
        },
      ],
    });
    const version = await transaction.submissionVersion.create({
      data: {
        submissionId: submission.id,
        versionNumber: 1,
        kind: "ORIGINAL",
        manuscriptStoredFileId: manuscriptStored.id,
      },
    });
    await transaction.submission.update({
      where: { id: submission.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
    await transaction.submissionEvent.create({
      data: {
        submissionId: submission.id,
        actorId: author.id,
        submissionVersionId: version.id,
        type: "SUBMISSION_RECEIVED",
        authorVisible: true,
      },
    });
    return version;
  });

  assert.equal(
    (await listEditorialSubmissions({ journalId: psychology.id })).some(
      ({ id }) => id === submission.id,
    ),
    true,
  );
  assert.equal(
    (await listEditorialSubmissions({ journalId: secondaryJournal.id })).some(
      ({ id }) => id === submission.id,
    ),
    false,
  );
  await beginInitialAssessment({
    adminId: administrator.id,
    journalId: psychology.id,
    submissionId: submission.id,
  });
  const roundOne = await passInitialAssessment({
    adminId: administrator.id,
    journalId: psychology.id,
    submissionId: submission.id,
  });
  await expectDenied(() =>
    assignReviewer({
      adminId: administrator.id,
      journalId: psychology.id,
      submissionId: submission.id,
      editorId: crossEditor.id,
    }),
  );
  const assignmentOne = await assignReviewer({
    adminId: administrator.id,
    journalId: psychology.id,
    submissionId: submission.id,
    editorId: editorOne.id,
  });
  const assignmentTwo = await assignReviewer({
    adminId: administrator.id,
    journalId: psychology.id,
    submissionId: submission.id,
    editorId: editorTwo.id,
  });
  assert.equal(
    (
      await prisma.submission.findUniqueOrThrow({
        where: { id: submission.id },
      })
    ).status,
    "UNDER_REVIEW",
  );
  assert.equal(await canDownload(editorOne.client, manuscriptPath), true);
  assert.equal(await canDownload(editorOne.client, coverPath), false);
  assert.equal(await canDownload(crossEditor.client, manuscriptPath), false);
  const blinded = await getBlindedAssignment({
    journalId: psychology.id,
    editorId: editorOne.id,
    assignmentId: assignmentOne.id,
  });
  assert(blinded);
  assert.equal(hasBlindIdentityLeak(blinded), false);

  await saveEditorReview({
    editorId: editorOne.id,
    journalId: psychology.id,
    assignmentId: assignmentOne.id,
    reviewVersion: 0,
    final: true,
    review: {
      titleAbstract: 8,
      introductionThesis: 8,
      literatureReview: 8,
      methodology: 8,
      resultsDiscussion: 8,
      conclusion: 8,
      languageStyle: 8,
      apaAdherence: 8,
      generalReport: "Clarify the sampling procedure.",
      commentsToAuthor: "Clarify the sampling procedure.",
      confidentialComments: "Methodology needs a focused revision.",
      recommendation: "MINOR_REVISION",
    },
  });
  await saveEditorReview({
    editorId: editorTwo.id,
    journalId: psychology.id,
    assignmentId: assignmentTwo.id,
    reviewVersion: 0,
    final: true,
    review: {
      titleAbstract: 9,
      introductionThesis: 8,
      literatureReview: 8,
      methodology: 8,
      resultsDiscussion: 8,
      conclusion: 8,
      languageStyle: 9,
      apaAdherence: 9,
      generalReport: "Strengthen the limitations section.",
      commentsToAuthor: "Strengthen the limitations section.",
      confidentialComments: "Suitable after a minor revision.",
      recommendation: "MINOR_REVISION",
    },
  });
  assert.equal(
    (
      await prisma.submission.findUniqueOrThrow({
        where: { id: submission.id },
      })
    ).status,
    "REVIEWS_RECEIVED",
  );
  const adminDetail = await getEditorialSubmission(
    psychology.id,
    submission.id,
  );
  assert.equal(
    adminDetail?.reviewRounds[0].assignments.some(
      ({ review }) =>
        review?.confidentialComments ===
        "Methodology needs a focused revision.",
    ),
    true,
  );
  await issueEditorialDecision({
    adminId: administrator.id,
    journalId: psychology.id,
    submissionId: submission.id,
    roundId: roundOne.id,
    type: "MINOR_REVISION",
    reason: "Both reviews identify limited, addressable revisions.",
    authorMessage:
      "Please revise the sampling and limitations sections in response to both reviewers.",
    revisionDueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  });
  const authorHistory = await getAuthorEditorialHistory(
    author.id,
    submission.id,
  );
  assert(authorHistory);
  const authorAssignment =
    authorHistory.editorialDecisions[0]?.reviewRound?.assignments[0];
  assert(authorAssignment?.review);
  assert.deepEqual(Object.keys(authorAssignment), ["review"]);
  assert.equal("confidentialComments" in authorAssignment.review, false);

  const revisionPath = createSubmissionObjectPath({
    journalId: psychology.id,
    submissionId: submission.id,
    originalFileName: "anonymous-revision.pdf",
  });
  await upload(author.client, revisionPath, "%PDF-1.4 revised manuscript");
  const revisedVersion = await recordRevision({
    ownerId: author.id,
    submissionId: submission.id,
    authorNote: "Addressed both reviewers’ comments.",
    manuscript: {
      bucket: storageBuckets.privateAcademicFiles,
      objectPath: revisionPath,
      originalFileName: "anonymous-revision.pdf",
      mimeType: "application/pdf",
      sizeBytes: 28,
    },
  });
  const revisionStored = await prisma.submissionVersion.findUniqueOrThrow({
    where: { id: revisedVersion.id },
    select: { manuscriptStoredFileId: true },
  });
  storedFileIds.push(revisionStored.manuscriptStoredFileId);
  assert.equal(
    await prisma.submissionVersion.count({
      where: { submissionId: submission.id },
    }),
    2,
  );
  assert(
    await prisma.submissionVersion.findUnique({
      where: { id: originalVersion.id },
    }),
  );
  await beginInitialAssessment({
    adminId: administrator.id,
    journalId: psychology.id,
    submissionId: submission.id,
  });
  const roundTwo = await passInitialAssessment({
    adminId: administrator.id,
    journalId: psychology.id,
    submissionId: submission.id,
  });
  assert.equal(roundTwo.roundNumber, 2);
  assert.equal(
    await prisma.reviewRound.count({ where: { submissionId: submission.id } }),
    2,
  );
  await prisma.user.update({
    where: { id: editorOne.id },
    data: { isActive: false },
  });
  await expectDenied(() =>
    assignReviewer({
      adminId: administrator.id,
      journalId: psychology.id,
      submissionId: submission.id,
      editorId: editorOne.id,
    }),
  );
  console.log("Live Phase 4 lifecycle and isolation checks passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
