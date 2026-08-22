import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

import { prisma } from "../lib/db/prisma";
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
const identityPath = "/tmp/imsu-phase5-browser-identities.json";
const emailPrefix = "phase5-ui-";
const displayPrefix = "Phase 5 UI ";

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

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { displayName: { startsWith: displayPrefix } },
    select: { id: true },
  });
  const userIds = users.map(({ id }) => id);
  const requests = await prisma.submissionRequest.findMany({
    where: { authorId: { in: userIds } },
    select: { id: true },
  });
  const submissions = await prisma.submission.findMany({
    where: { ownerId: { in: userIds } },
    select: { id: true },
  });
  const storedFiles = await prisma.storedFile.findMany({
    where: { uploaderId: { in: userIds } },
    select: { id: true, objectPath: true },
  });
  await prisma.submissionRequest.deleteMany({
    where: { id: { in: requests.map(({ id }) => id) } },
  });
  await prisma.submission.deleteMany({
    where: { id: { in: submissions.map(({ id }) => id) } },
  });
  await prisma.storedFile.deleteMany({
    where: { id: { in: storedFiles.map(({ id }) => id) } },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (storedFiles.length) {
    await retry(() =>
      service.storage
        .from(storageBuckets.privateAcademicFiles)
        .remove(storedFiles.map(({ objectPath }) => objectPath)),
    );
  }
  const listed = await retry(() =>
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  );
  assert.ifError(listed.error);
  for (const user of listed.data.users) {
    if (user.email?.startsWith(emailPrefix)) {
      await retry(() => service.auth.admin.deleteUser(user.id));
    }
  }
  await rm(identityPath, { force: true });
}

async function createIdentity(label: string, password: string) {
  const email = `${emailPrefix}${label}@example.test`;
  const { data, error } = await retry(() =>
    service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    }),
  );
  assert.ifError(error);
  assert(data.user);
  return { id: data.user.id, email, password };
}

async function upload(path: string, body: string) {
  const { error } = await retry(() =>
    service.storage
      .from(storageBuckets.privateAcademicFiles)
      .upload(path, Buffer.from(body), { contentType: "application/pdf" }),
  );
  assert.ifError(error);
}

async function main() {
  await cleanup();
  if (process.argv.includes("--cleanup")) return;

  const password = `Phase5Browser-${randomUUID()}aA!`;
  const emptyAuthor = await createIdentity("empty-author", password);
  const author = await createIdentity("author", password);
  const administrator = await createIdentity("admin", password);
  const journal = await prisma.journal.findUniqueOrThrow({
    where: { slug: "psychology" },
    include: { department: true },
  });
  await prisma.user.createMany({
    data: [
      { id: emptyAuthor.id, displayName: `${displayPrefix}New Author` },
      { id: author.id, displayName: `${displayPrefix}Author` },
      { id: administrator.id, displayName: `${displayPrefix}Administrator` },
    ],
  });
  await prisma.userGlobalRole.createMany({
    data: [
      { userId: emptyAuthor.id, role: "AUTHOR" },
      { userId: author.id, role: "AUTHOR" },
    ],
  });
  await prisma.journalRoleAssignment.create({
    data: {
      userId: administrator.id,
      journalId: journal.id,
      role: "JOURNAL_ADMIN",
    },
  });

  const receiptRequest = await prisma.submissionRequest.create({
    data: {
      departmentId: journal.departmentId,
      journalId: journal.id,
      authorId: author.id,
      status: "RECEIPT_SUBMITTED",
      messages: {
        create: [
          {
            body: "Good afternoon. I would like to submit an article for consideration.",
            senderId: author.id,
          },
          {
            body: "Thank you. Please make the review payment using the department instructions and upload your receipt here.",
            senderId: administrator.id,
          },
        ],
      },
    },
  });
  const receiptPath = createRequestObjectPath({
    departmentId: journal.departmentId,
    requestId: receiptRequest.id,
    originalFileName: "payment-receipt.pdf",
  });
  await upload(receiptPath, "%PDF-1.4 Phase 5 browser receipt");
  const receiptFile = await prisma.storedFile.create({
    data: {
      bucket: storageBuckets.privateAcademicFiles,
      objectPath: receiptPath,
      originalFileName: "payment-receipt.pdf",
      mimeType: "application/pdf",
      sizeBytes: 32,
      uploaderId: author.id,
    },
  });
  await prisma.submissionConversationMessage.create({
    data: {
      requestId: receiptRequest.id,
      senderId: author.id,
      body: "I have attached my payment receipt.",
      attachments: {
        create: { storedFileId: receiptFile.id, type: "PAYMENT_RECEIPT" },
      },
    },
  });

  const enabledRequest = await prisma.submissionRequest.create({
    data: {
      departmentId: journal.departmentId,
      journalId: journal.id,
      authorId: author.id,
      status: "SUBMISSION_ENABLED",
      paymentConfirmedAt: new Date(),
      paymentConfirmedById: administrator.id,
      submissionEnabledAt: new Date(),
      submissionEnabledById: administrator.id,
      messages: {
        create: [
          {
            body: "Payment confirmed. Article submission is now available.",
            kind: "SYSTEM",
          },
          {
            body: "You can now complete the article form and upload your manuscript.",
            senderId: administrator.id,
          },
        ],
      },
    },
  });

  const submission = await prisma.submission.create({
    data: {
      journalId: journal.id,
      ownerId: author.id,
      trackingNumber: "PSY-2026-UI-001",
      title: "Psychological wellbeing and learning support",
      abstract:
        "A visual quality assurance fixture for the Phase 5 operations flow.",
      keywords: ["psychology", "wellbeing", "students"],
      status: "SUBMITTED",
      submittedAt: new Date(),
      declarationAccuracy: true,
      declarationAuthority: true,
      declarationReadiness: true,
      authors: {
        create: {
          fullName: "Phase Five UI Author",
          email: author.email,
          affiliation: "Imo State University",
          position: 1,
          isCorrespondingAuthor: true,
        },
      },
    },
  });
  const manuscriptPath = createSubmissionObjectPath({
    journalId: journal.id,
    submissionId: submission.id,
    originalFileName: "psychology-manuscript.pdf",
  });
  await upload(manuscriptPath, "%PDF-1.4 Phase 5 browser manuscript");
  const manuscriptFile = await prisma.storedFile.create({
    data: {
      bucket: storageBuckets.privateAcademicFiles,
      objectPath: manuscriptPath,
      originalFileName: "psychology-manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: 35,
      uploaderId: author.id,
    },
  });
  await prisma.submissionFile.create({
    data: {
      submissionId: submission.id,
      storedFileId: manuscriptFile.id,
      type: "MANUSCRIPT",
    },
  });
  await prisma.submissionVersion.create({
    data: {
      submissionId: submission.id,
      versionNumber: 1,
      kind: "ORIGINAL",
      manuscriptStoredFileId: manuscriptFile.id,
    },
  });
  const trackedRequest = await prisma.submissionRequest.create({
    data: {
      departmentId: journal.departmentId,
      journalId: journal.id,
      authorId: author.id,
      submissionId: submission.id,
      status: "TRACKING_ASSIGNED",
      paymentConfirmedAt: new Date(),
      paymentConfirmedById: administrator.id,
      submissionEnabledAt: new Date(),
      submissionEnabledById: administrator.id,
      trackingAssignedAt: new Date(),
      trackingAssignedById: administrator.id,
      messages: {
        create: [
          {
            body: "Your manuscript has been received and is awaiting a tracking ID.",
            kind: "SYSTEM",
          },
          {
            body: "Tracking ID assigned: PSY-2026-UI-001",
            kind: "SYSTEM",
          },
        ],
      },
    },
  });

  await writeFile(
    identityPath,
    JSON.stringify({
      emptyAuthor,
      author,
      administrator,
      requests: {
        receipt: receiptRequest.id,
        enabled: enabledRequest.id,
        tracked: trackedRequest.id,
      },
    }),
    { mode: 0o600 },
  );
  console.log(`Phase 5 browser fixtures ready at ${identityPath}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
