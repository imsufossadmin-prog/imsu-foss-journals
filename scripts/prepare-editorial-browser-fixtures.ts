import "dotenv/config";

import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

import {
  createSubmissionObjectPath,
  storageBuckets,
} from "../lib/storage/paths";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: required("DATABASE_URL") }),
});
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const service = createClient(supabaseUrl, required("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false },
});
const marker = "PSY-P4-UI-";
const identityPath = "/tmp/imsu-phase4-browser-identities.json";

async function createIdentity(label: string, password: string) {
  const email = `phase4-ui-${label}@example.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(error);
  assert(data.user);
  return { id: data.user.id, email, password };
}

async function cleanup() {
  const submissions = await prisma.submission.findMany({
    where: { trackingNumber: { startsWith: marker } },
    select: {
      id: true,
      manuscriptVersions: {
        select: { manuscriptStoredFileId: true, responseStoredFileId: true },
      },
      files: { select: { storedFileId: true } },
    },
  });
  const fileIds = [
    ...new Set(
      submissions.flatMap((submission) => [
        ...submission.files.map(({ storedFileId }) => storedFileId),
        ...submission.manuscriptVersions.flatMap(
          ({ manuscriptStoredFileId, responseStoredFileId }) =>
            [manuscriptStoredFileId, responseStoredFileId].filter(
              (id): id is string => Boolean(id),
            ),
        ),
      ]),
    ),
  ];
  const stored = fileIds.length
    ? await prisma.storedFile.findMany({
        where: { id: { in: fileIds } },
        select: { objectPath: true },
      })
    : [];
  await prisma.submission.deleteMany({
    where: { id: { in: submissions.map(({ id }) => id) } },
  });
  if (fileIds.length)
    await prisma.storedFile.deleteMany({ where: { id: { in: fileIds } } });
  await prisma.user.deleteMany({
    where: { displayName: { startsWith: "Phase 4 UI Reviewer" } },
  });
  if (stored.length)
    await service.storage
      .from(storageBuckets.privateAcademicFiles)
      .remove(stored.map(({ objectPath }) => objectPath));
  const listed = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assert.ifError(listed.error);
  for (const user of listed.data.users) {
    if (user.email?.startsWith("phase4-ui-")) {
      await prisma.user.deleteMany({ where: { id: user.id } });
      await service.auth.admin.deleteUser(user.id);
    }
  }
  await rm(identityPath, { force: true });
}

async function createManuscript(input: {
  journalId: string;
  ownerId: string;
  trackingNumber: string;
  title: string;
  status: "UNDER_REVIEW" | "REVIEWS_RECEIVED" | "REVISION_REQUESTED";
}) {
  const submission = await prisma.submission.create({
    data: {
      journalId: input.journalId,
      ownerId: input.ownerId,
      trackingNumber: input.trackingNumber,
      title: input.title,
      abstract:
        "A browser-validation manuscript for the FOSS double-blind editorial process.",
      keywords: ["editorial review", "social sciences"],
      status: input.status,
      submittedAt: new Date(),
      declarationAccuracy: true,
      declarationAuthority: true,
      declarationReadiness: true,
      authors: {
        create: {
          fullName: "Browser Fixture Author",
          position: 1,
          isCorrespondingAuthor: true,
        },
      },
    },
  });
  const objectPath = createSubmissionObjectPath({
    journalId: input.journalId,
    submissionId: submission.id,
    originalFileName: "anonymous-manuscript.pdf",
  });
  const { error } = await service.storage
    .from(storageBuckets.privateAcademicFiles)
    .upload(objectPath, Buffer.from("%PDF-1.4 browser fixture"), {
      contentType: "application/pdf",
    });
  assert.ifError(error);
  const stored = await prisma.storedFile.create({
    data: {
      bucket: storageBuckets.privateAcademicFiles,
      objectPath,
      originalFileName: "anonymous-manuscript.pdf",
      mimeType: "application/pdf",
      sizeBytes: 24,
      uploaderId: input.ownerId,
    },
  });
  const version = await prisma.submissionVersion.create({
    data: {
      submissionId: submission.id,
      versionNumber: 1,
      kind: "ORIGINAL",
      manuscriptStoredFileId: stored.id,
    },
  });
  return { submission, version };
}

async function createSubmittedReview(
  roundId: string,
  editorId: string,
  comment: string,
) {
  await prisma.reviewAssignment.create({
    data: {
      reviewRoundId: roundId,
      editorId,
      status: "COMPLETED",
      completedAt: new Date(),
      review: {
        create: {
          status: "SUBMITTED",
          originality: 4,
          methodology: 4,
          clarity: 5,
          relevance: 5,
          recommendation: "MINOR_REVISION",
          commentsToAuthor: comment,
          confidentialComments: "Browser fixture confidential note.",
          submittedAt: new Date(),
        },
      },
    },
  });
}

async function main() {
  await cleanup();
  if (process.argv.includes("--cleanup")) return;
  const password = `P4Browser-${randomUUID()}aA!`;
  const [administrator, editor, author] = await Promise.all([
    createIdentity("admin", password),
    createIdentity("editor", password),
    createIdentity("author", password),
  ]);
  const adminId = administrator.id;
  const editorId = editor.id;
  const authorId = author.id;
  const journal = await prisma.journal.findUniqueOrThrow({
    where: { slug: "psychology" },
  });
  const syntheticIds = [randomUUID(), randomUUID(), randomUUID()];
  await prisma.user.createMany({
    data: [
      { id: adminId, displayName: "Phase 4 UI Administrator" },
      { id: editorId, displayName: "Phase 4 UI Editor" },
      { id: authorId, displayName: "Phase 4 UI Author" },
      ...syntheticIds.map((id, index) => ({
        id,
        displayName: `Phase 4 UI Reviewer ${index + 2}`,
      })),
    ],
  });
  await prisma.journalRoleAssignment.createMany({
    data: [
      { userId: adminId, journalId: journal.id, role: "JOURNAL_ADMIN" },
      { userId: editorId, journalId: journal.id, role: "EDITOR" },
      ...syntheticIds.map((userId) => ({
        userId,
        journalId: journal.id,
        role: "EDITOR" as const,
      })),
    ],
  });
  await prisma.userGlobalRole.create({
    data: { userId: authorId, role: "AUTHOR" },
  });
  await writeFile(
    identityPath,
    JSON.stringify({ administrator, editor, author }),
    { mode: 0o600 },
  );

  const active = await createManuscript({
    journalId: journal.id,
    ownerId: authorId,
    trackingNumber: `${marker}ACTIVE`,
    title: "Community participation and public service outcomes",
    status: "UNDER_REVIEW",
  });
  const activeRound = await prisma.reviewRound.create({
    data: {
      submissionId: active.submission.id,
      submissionVersionId: active.version.id,
      roundNumber: 1,
      status: "ACTIVE",
      openedAt: new Date(),
    },
  });
  await prisma.reviewAssignment.create({
    data: {
      reviewRoundId: activeRound.id,
      editorId,
      status: "IN_REVIEW",
      review: {
        create: { status: "DRAFT", originality: 4, methodology: 3, version: 1 },
      },
    },
  });
  await createSubmittedReview(
    activeRound.id,
    syntheticIds[0],
    "Clarify how participants were selected.",
  );

  const complete = await createManuscript({
    journalId: journal.id,
    ownerId: authorId,
    trackingNumber: `${marker}DECISION`,
    title: "Behavioural evidence in local development planning",
    status: "REVIEWS_RECEIVED",
  });
  const completeRound = await prisma.reviewRound.create({
    data: {
      submissionId: complete.submission.id,
      submissionVersionId: complete.version.id,
      roundNumber: 1,
      status: "ACTIVE",
      openedAt: new Date(),
    },
  });
  await createSubmittedReview(
    completeRound.id,
    syntheticIds[1],
    "Strengthen the connection between findings and conclusions.",
  );
  await createSubmittedReview(
    completeRound.id,
    syntheticIds[2],
    "Explain the methodological limitations more directly.",
  );

  const revision = await createManuscript({
    journalId: journal.id,
    ownerId: authorId,
    trackingNumber: `${marker}REVISION`,
    title: "Social trust and institutional responsiveness",
    status: "REVISION_REQUESTED",
  });
  const revisionRound = await prisma.reviewRound.create({
    data: {
      submissionId: revision.submission.id,
      submissionVersionId: revision.version.id,
      roundNumber: 1,
      status: "COMPLETED",
      openedAt: new Date(),
      closedAt: new Date(),
    },
  });
  await createSubmittedReview(
    revisionRound.id,
    syntheticIds[1],
    "Clarify the sampling strategy before reconsideration.",
  );
  await createSubmittedReview(
    revisionRound.id,
    syntheticIds[2],
    "Expand the limitations and implications sections.",
  );
  await prisma.editorialDecision.create({
    data: {
      submissionId: revision.submission.id,
      reviewRoundId: revisionRound.id,
      decidedById: adminId,
      type: "MAJOR_REVISION",
      authorMessage:
        "Please submit a revised anonymous manuscript that addresses both reviews.",
      reason: "Substantive but addressable revisions are required.",
      revisionDueAt: new Date(Date.now() + 21 * 86400000),
    },
  });
  await prisma.submissionEvent.create({
    data: {
      submissionId: revision.submission.id,
      actorId: adminId,
      reviewRoundId: revisionRound.id,
      type: "EDITORIAL_DECISION",
      message:
        "Please submit a revised anonymous manuscript that addresses both reviews.",
      authorVisible: true,
    },
  });
  console.log(
    JSON.stringify({
      adminInbox: `/admin/psychology`,
      adminDecision: `/admin/psychology/submissions/${complete.submission.id}`,
      editorAssignment: `/editor/psychology/assignments/${(await prisma.reviewAssignment.findFirstOrThrow({ where: { reviewRoundId: activeRound.id, editorId }, select: { id: true } })).id}`,
      authorDecision: `/author/submissions/${revision.submission.id}`,
      revisionForm: `/author/submissions/${revision.submission.id}/revision`,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
