import "dotenv/config";

import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

import { prisma } from "../lib/db/prisma";
import { beginInitialAssessment } from "../lib/editorial/mutations";
import {
  assignTrackingId,
  beginRequestSubmission,
  confirmPaymentAndEnableSubmission,
  createSubmissionRequest,
  finalizeRequestSubmission,
  saveSimpleArticle,
  sendRequestMessage,
} from "../lib/requests/mutations";
import {
  createRequestObjectPath,
  createSubmissionObjectPath,
  storageBuckets,
} from "../lib/storage/paths";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const service = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SECRET_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const runId = randomUUID().slice(0, 8).toUpperCase();
const emailPrefix = `phase5-${runId.toLowerCase()}`;
const storagePaths: string[] = [];
const authIds: string[] = [];

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

async function identity(label: string) {
  const { data, error } = await retry(() =>
    service.auth.admin.createUser({
      email: `${emailPrefix}-${label}@example.test`,
      password: `Phase5-${randomUUID()}aA!`,
      email_confirm: true,
    }),
  );
  assert.ifError(error);
  assert(data.user);
  authIds.push(data.user.id);
  return data.user.id;
}

async function expectDenied(work: () => Promise<unknown>) {
  await assert.rejects(work);
}

async function cleanup() {
  const requests = await prisma.submissionRequest.findMany({
    where: { author: { displayName: { startsWith: `Phase 5 ${runId}` } } },
    select: {
      id: true,
      submission: {
        select: {
          id: true,
          files: { select: { storedFileId: true } },
          manuscriptVersions: {
            select: {
              manuscriptStoredFileId: true,
              responseStoredFileId: true,
            },
          },
        },
      },
      messages: {
        select: {
          attachments: {
            select: { storedFileId: true },
          },
        },
      },
    },
  });
  const storedFileIds = [
    ...new Set(
      requests.flatMap((request) => [
        ...request.messages.flatMap((message) =>
          message.attachments.map(({ storedFileId }) => storedFileId),
        ),
        ...(request.submission?.files.map(({ storedFileId }) => storedFileId) ??
          []),
        ...(request.submission?.manuscriptVersions.flatMap((version) =>
          [version.manuscriptStoredFileId, version.responseStoredFileId].filter(
            (id): id is string => Boolean(id),
          ),
        ) ?? []),
      ]),
    ),
  ];
  const submissionIds = requests
    .map(({ submission }) => submission?.id)
    .filter((id): id is string => Boolean(id));
  await prisma.submissionRequest.deleteMany({
    where: { id: { in: requests.map(({ id }) => id) } },
  });
  await prisma.submission.deleteMany({
    where: { id: { in: submissionIds } },
  });
  if (storedFileIds.length) {
    await prisma.storedFile.deleteMany({
      where: { id: { in: storedFileIds } },
    });
  }
  await prisma.user.deleteMany({ where: { id: { in: authIds } } });
  if (storagePaths.length) {
    await service.storage
      .from(storageBuckets.privateAcademicFiles)
      .remove(storagePaths);
  }
  for (const id of authIds) await service.auth.admin.deleteUser(id);
}

async function main() {
  console.log("Live Phase 5 validation started.");
  const psychology = await prisma.journal.findUniqueOrThrow({
    where: { slug: "psychology" },
    include: { department: true },
  });
  assert.equal(psychology.department.slug, "psychology");
  assert.equal(psychology.isActive, true);
  const legacy = await prisma.journal.findMany({
    where: { slug: { in: ["ajsbs", "gjsbr", "njsbr"] } },
    select: { isActive: true },
  });
  assert.equal(
    legacy.every(({ isActive }) => !isActive),
    true,
  );
  const sociology = await prisma.journal.findUniqueOrThrow({
    where: { slug: "imsu-foss-development-journal" },
    include: { department: true },
  });

  const authorId = await identity("author");
  const otherAuthorId = await identity("other-author");
  const adminId = await identity("admin");
  const otherAdminId = await identity("other-admin");
  await prisma.user.createMany({
    data: [
      { id: authorId, displayName: `Phase 5 ${runId} Author` },
      { id: otherAuthorId, displayName: `Phase 5 ${runId} Other Author` },
      { id: adminId, displayName: `Phase 5 ${runId} Psychology Admin` },
      { id: otherAdminId, displayName: `Phase 5 ${runId} Sociology Admin` },
    ],
  });
  await Promise.all([
    prisma.userGlobalRole.createMany({
      data: [
        { userId: authorId, role: "AUTHOR" },
        { userId: otherAuthorId, role: "AUTHOR" },
      ],
    }),
    prisma.journalRoleAssignment.create({
      data: {
        userId: adminId,
        journalId: psychology.id,
        role: "JOURNAL_ADMIN",
      },
    }),
    prisma.journalRoleAssignment.create({
      data: {
        userId: otherAdminId,
        journalId: sociology.id,
        role: "JOURNAL_ADMIN",
      },
    }),
  ]);

  const request = await createSubmissionRequest(authorId);
  await sendRequestMessage({
    actorId: authorId,
    requestId: request.id,
    body: "I would like to submit an article.",
  });
  await expectDenied(() =>
    sendRequestMessage({
      actorId: otherAuthorId,
      requestId: request.id,
      body: "Unauthorized message",
    }),
  );
  await expectDenied(() =>
    sendRequestMessage({
      actorId: otherAdminId,
      requestId: request.id,
      body: "Cross-department message",
    }),
  );
  await sendRequestMessage({
    actorId: adminId,
    requestId: request.id,
    body: "Please pay the review fee and upload your receipt.",
  });

  const receiptBytes = Buffer.from("%PDF-1.4 Phase 5 receipt");
  const receiptPath = createRequestObjectPath({
    departmentId: psychology.departmentId,
    requestId: request.id,
    originalFileName: "receipt.pdf",
  });
  storagePaths.push(receiptPath);
  assert.ifError(
    (
      await service.storage
        .from(storageBuckets.privateAcademicFiles)
        .upload(receiptPath, receiptBytes, {
          contentType: "application/pdf",
        })
    ).error,
  );
  await prisma.$transaction(async (transaction) => {
    const stored = await transaction.storedFile.create({
      data: {
        bucket: storageBuckets.privateAcademicFiles,
        objectPath: receiptPath,
        originalFileName: "receipt.pdf",
        mimeType: "application/pdf",
        sizeBytes: receiptBytes.length,
        checksumSha256: createHash("sha256").update(receiptBytes).digest("hex"),
        uploaderId: authorId,
      },
    });
    await transaction.submissionConversationMessage.create({
      data: {
        requestId: request.id,
        senderId: authorId,
        body: "Payment receipt",
        attachments: {
          create: { storedFileId: stored.id, type: "PAYMENT_RECEIPT" },
        },
      },
    });
    await transaction.submissionRequest.update({
      where: { id: request.id },
      data: { status: "RECEIPT_SUBMITTED", version: { increment: 1 } },
    });
  });
  await expectDenied(() =>
    confirmPaymentAndEnableSubmission(authorId, request.id),
  );
  await expectDenied(() =>
    confirmPaymentAndEnableSubmission(otherAdminId, request.id),
  );
  await confirmPaymentAndEnableSubmission(adminId, request.id);
  const confirmed = await prisma.submissionRequest.findUniqueOrThrow({
    where: { id: request.id },
  });
  assert.equal(confirmed.status, "SUBMISSION_ENABLED");
  assert.equal(confirmed.paymentConfirmedById, adminId);
  assert(confirmed.paymentConfirmedAt);
  assert(confirmed.submissionEnabledAt);

  await expectDenied(() => beginRequestSubmission(otherAuthorId, request.id));
  const submission = await beginRequestSubmission(authorId, request.id);
  let draft = await prisma.submission.findUniqueOrThrow({
    where: { id: submission.id },
  });
  await saveSimpleArticle({
    authorId,
    requestId: request.id,
    submissionId: submission.id,
    version: draft.version,
    title: "Psychological wellbeing among university students",
    abstract: "A Phase 5 lifecycle validation abstract.",
    keywords: ["psychology", "wellbeing"],
    authors: [
      {
        fullName: "Phase Five Author",
        email: `${emailPrefix}-author@example.test`,
        affiliation: "Imo State University",
        orcid: "",
        isCorrespondingAuthor: true,
      },
    ],
  });
  draft = await prisma.submission.findUniqueOrThrow({
    where: { id: submission.id },
  });
  const manuscriptBytes = Buffer.from("%PDF-1.4 Phase 5 manuscript");
  const manuscriptPath = createSubmissionObjectPath({
    journalId: psychology.id,
    submissionId: submission.id,
    originalFileName: "manuscript.pdf",
  });
  storagePaths.push(manuscriptPath);
  assert.ifError(
    (
      await service.storage
        .from(storageBuckets.privateAcademicFiles)
        .upload(manuscriptPath, manuscriptBytes, {
          contentType: "application/pdf",
        })
    ).error,
  );
  const manuscriptFile = await prisma.storedFile.create({
    data: {
      bucket: storageBuckets.privateAcademicFiles,
      objectPath: manuscriptPath,
      originalFileName: "manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: manuscriptBytes.length,
      uploaderId: authorId,
    },
  });
  await prisma.submissionFile.create({
    data: {
      submissionId: submission.id,
      storedFileId: manuscriptFile.id,
      type: "MANUSCRIPT",
    },
  });
  await finalizeRequestSubmission(authorId, request.id, submission.id);
  let submitted = await prisma.submission.findUniqueOrThrow({
    where: { id: submission.id },
    include: { request: true, manuscriptVersions: true },
  });
  assert.equal(submitted.status, "SUBMITTED");
  assert.equal(submitted.trackingNumber, null);
  assert.equal(submitted.request?.status, "MANUSCRIPT_SUBMITTED");
  assert.equal(submitted.manuscriptVersions.length, 1);

  await expectDenied(() =>
    assignTrackingId({
      actorId: authorId,
      requestId: request.id,
      trackingId: `PSY-${runId}`,
    }),
  );
  await assignTrackingId({
    actorId: adminId,
    requestId: request.id,
    trackingId: `PSY-${runId}`,
  });
  submitted = await prisma.submission.findUniqueOrThrow({
    where: { id: submission.id },
    include: { request: true, manuscriptVersions: true },
  });
  assert.equal(submitted.trackingNumber, `PSY-${runId}`);
  assert.equal(submitted.request?.status, "TRACKING_ASSIGNED");
  await assert.rejects(
    prisma.submission.create({
      data: {
        journalId: psychology.id,
        ownerId: otherAuthorId,
        trackingNumber: `PSY-${runId}`,
      },
    }),
    (error: unknown) =>
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002",
  );
  await beginInitialAssessment({
    adminId,
    journalId: psychology.id,
    submissionId: submission.id,
  });
  assert.equal(
    (
      await prisma.submission.findUniqueOrThrow({
        where: { id: submission.id },
      })
    ).status,
    "SCREENING",
  );

  const { data: buckets, error: bucketError } =
    await service.storage.listBuckets();
  assert.ifError(bucketError);
  const privateBucket = buckets.find(
    ({ id }) => id === storageBuckets.privateAcademicFiles,
  );
  assert(privateBucket);
  assert.equal(privateBucket.public, false);
  console.log("Live Phase 5 lifecycle passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch((error) => console.error("Cleanup failed", error));
    await prisma.$disconnect();
  });
