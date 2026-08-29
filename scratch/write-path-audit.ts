import "dotenv/config";

import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import {
  assignManagedRoleForActor,
  removeManagedRoleForActor,
} from "../lib/auth/role-management";
import { prisma } from "../lib/db/prisma";
import {
  beginInitialAssessment,
  publishArticle,
} from "../lib/editorial/mutations";
import { confirmPaymentAndEnableSubmission } from "../lib/requests/mutations";

type Sample = { label: string; milliseconds: number };

const runId = `write-audit-${Date.now()}`;
const fixtureUserId = randomUUID();
const samples: Sample[] = [];

function elapsed(startedAt: number) {
  return Number((performance.now() - startedAt).toFixed(1));
}

function record(label: string, startedAt: number) {
  samples.push({ label, milliseconds: elapsed(startedAt) });
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

async function main() {
  const [admin, journal] = await Promise.all([
    prisma.user.findFirst({
      where: { globalRoles: { some: { role: "SUPER_ADMIN" } } },
      select: { id: true },
    }),
    prisma.journal.findUnique({
      where: { slug: "psychology" },
      select: { id: true, departmentId: true },
    }),
  ]);
  console.log("Found admin:", admin?.id, "journal:", journal?.id);

  await prisma.user.create({
    data: {
      id: fixtureUserId,
      email: `${runId}@example.invalid`,
      displayName: "Write Path Audit Fixture",
      globalRoles: { create: { role: "AUTHOR" } },
    },
  });
  console.log("Created fixture user");

  for (let index = 0; index < 5; index += 1) {
    const startedAt = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    record("database ping", startedAt);
  }
  console.log("Completed database pings");

  const anatomyRequest = await prisma.submissionRequest.create({
    data: {
      authorId: fixtureUserId,
      departmentId: journal.departmentId,
      journalId: journal.id,
      status: "RECEIPT_SUBMITTED",
    },
  });
  console.log("Created anatomy request");

  const startedAt = performance.now();
  await Promise.all([
    prisma.user.findUnique({
      where: { id: admin.id },
      include: {
        globalRoles: true,
        journalRoles: {
          include: { journal: { select: { departmentId: true } } },
        },
      },
    }),
    prisma.submissionRequest.findUnique({
      where: { id: anatomyRequest.id },
      select: {
        id: true,
        authorId: true,
        departmentId: true,
        journalId: true,
        status: true,
      },
    }),
  ]);
  record("confirm authorization lookup", startedAt);

  const anatomy: Record<string, number> = {};

  for (let index = 0; index < 5; index += 1) {
    const request = await prisma.submissionRequest.create({
      data: {
        authorId: fixtureUserId,
        departmentId: journal.departmentId,
        journalId: journal.id,
        status: "RECEIPT_SUBMITTED",
      },
    });
    const actionStartedAt = performance.now();
    await confirmPaymentAndEnableSubmission(admin.id, request.id);
    record("confirm payment mutation", actionStartedAt);
    await prisma.submissionRequest.delete({ where: { id: request.id } });
  }

  for (let index = 0; index < 5; index += 1) {
    const submission = await prisma.submission.create({
      data: {
        ownerId: fixtureUserId,
        journalId: journal.id,
        trackingNumber: `${runId}-assessment-${index}`,
        status: "SUBMITTED",
      },
    });
    const actionStartedAt = performance.now();
    await beginInitialAssessment({
      adminId: admin.id,
      journalId: journal.id,
      submissionId: submission.id,
    });
    record("begin assessment mutation", actionStartedAt);
    await prisma.submission.delete({ where: { id: submission.id } });
  }

  for (let index = 0; index < 3; index += 1) {
    const actionStartedAt = performance.now();
    await assignManagedRoleForActor(admin.id, {
      targetUserId: fixtureUserId,
      role: "EDITOR",
      journalId: journal.id,
    });
    record("assign editor role mutation", actionStartedAt);

    const removalStartedAt = performance.now();
    await removeManagedRoleForActor(admin.id, {
      targetUserId: fixtureUserId,
      role: "EDITOR",
      journalId: journal.id,
    });
    record("remove editor role mutation", removalStartedAt);
  }

  for (let index = 0; index < 3; index += 1) {
    const volumeNumber = 9000 + index;
    const submission = await prisma.submission.create({
      data: {
        ownerId: fixtureUserId,
        journalId: journal.id,
        trackingNumber: `${runId}-publish-${index}`,
        title: `Write audit publication ${index}`,
        abstract: "Temporary performance audit fixture.",
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
    const actionStartedAt = performance.now();
    await publishArticle({
      adminId: admin.id,
      journalId: journal.id,
      submissionId: submission.id,
      volume: String(volumeNumber),
      issue: "1",
      pageRange: "1-10",
    });
    record("publish article mutation", actionStartedAt);

    await prisma.article.deleteMany({
      where: { slug: `art-${submission.id.toLowerCase()}` },
    });
    await prisma.issue.deleteMany({
      where: { volume: { journalId: journal.id, number: volumeNumber } },
    });
    await prisma.volume.deleteMany({
      where: { journalId: journal.id, number: volumeNumber },
    });
    await prisma.submission.delete({ where: { id: submission.id } });
  }

  const grouped = Object.fromEntries(
    [...new Set(samples.map(({ label }) => label))].map((label) => {
      const values = samples
        .filter((sample) => sample.label === label)
        .map(({ milliseconds }) => milliseconds);
      return [label, { samples: values, median: median(values) }];
    }),
  );

  console.log(JSON.stringify({ runId, anatomy, grouped }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.roleChangeEvent.deleteMany({
      where: {
        OR: [{ actorId: fixtureUserId }, { targetUserId: fixtureUserId }],
      },
    });
    await prisma.submissionRequest.deleteMany({
      where: { authorId: fixtureUserId },
    });
    await prisma.submission.deleteMany({ where: { ownerId: fixtureUserId } });
    await prisma.user.deleteMany({ where: { id: fixtureUserId } });
    await prisma.$disconnect();
  });
