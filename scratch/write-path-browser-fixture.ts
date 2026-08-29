import "dotenv/config";

import { randomUUID } from "node:crypto";

import { prisma } from "../lib/db/prisma";

const fixtureEmail = "write-path-browser-audit@example.invalid";

async function cleanup() {
  const user = await prisma.user.findUnique({
    where: { email: fixtureEmail },
    select: { id: true },
  });
  if (!user) return;

  await prisma.roleChangeEvent.deleteMany({
    where: { OR: [{ actorId: user.id }, { targetUserId: user.id }] },
  });
  await prisma.article.deleteMany({
    where: { title: { startsWith: "Write path browser audit" } },
  });
  await prisma.issue.deleteMany({
    where: { volume: { number: { in: [9101, 9102] } } },
  });
  await prisma.volume.deleteMany({ where: { number: { in: [9101, 9102] } } });
  await prisma.submissionRequest.deleteMany({ where: { authorId: user.id } });
  await prisma.submission.deleteMany({ where: { ownerId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

async function prepare() {
  await cleanup();
  const journal = await prisma.journal.findUnique({
    where: { slug: "psychology" },
    select: { id: true, departmentId: true },
  });
  if (!journal) throw new Error("Psychology journal is unavailable.");

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: fixtureEmail,
      displayName: "Write Path Browser Audit",
      globalRoles: { create: { role: "AUTHOR" } },
    },
  });
  const request = await prisma.submissionRequest.create({
    data: {
      authorId: user.id,
      departmentId: journal.departmentId,
      journalId: journal.id,
      status: "RECEIPT_SUBMITTED",
      messages: {
        create: {
          kind: "SYSTEM",
          body: "Temporary write-path audit fixture.",
        },
      },
    },
  });
  const assessment = await prisma.submission.create({
    data: {
      ownerId: user.id,
      journalId: journal.id,
      trackingNumber: `AUDIT-${Date.now()}-ASSESS`,
      title: "Write path browser audit assessment",
      abstract: "Temporary audit fixture.",
      status: "SUBMITTED",
      authors: {
        create: {
          fullName: "Audit Author",
          position: 1,
          isCorrespondingAuthor: true,
        },
      },
    },
  });
  const publishing = await prisma.submission.create({
    data: {
      ownerId: user.id,
      journalId: journal.id,
      trackingNumber: `AUDIT-${Date.now()}-PUBLISH`,
      title: "Write path browser audit publishing",
      abstract: "Temporary audit fixture.",
      status: "ACCEPTED",
      authors: {
        create: [
          {
            fullName: "Audit Author One",
            position: 1,
            isCorrespondingAuthor: true,
          },
          { fullName: "Audit Author Two", position: 2 },
        ],
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        requestId: request.id,
        assessmentSubmissionId: assessment.id,
        publishingSubmissionId: publishing.id,
        fixtureUserId: user.id,
      },
      null,
      2,
    ),
  );
}

const command = process.argv[2];
(command === "prepare" ? prepare() : cleanup())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
