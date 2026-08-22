import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

import { prisma } from "../lib/db/prisma";
import { storageBuckets } from "../lib/storage/paths";

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
const identityPath = "/tmp/imsu-phase5-entry-identities.json";
const receiptPath = "/tmp/imsu-phase5-entry-receipt.pdf";
const manuscriptPath = "/tmp/imsu-phase5-entry-manuscript.pdf";
const emailPrefix = "phase5-entry-ui-";
const displayPrefix = "Phase 5 Entry UI ";

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
  const files = await prisma.storedFile.findMany({
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
    where: { id: { in: files.map(({ id }) => id) } },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (files.length) {
    await retry(() =>
      service.storage
        .from(storageBuckets.privateAcademicFiles)
        .remove(files.map(({ objectPath }) => objectPath)),
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
  await Promise.all(
    [identityPath, receiptPath, manuscriptPath].map((path) =>
      rm(path, { force: true }),
    ),
  );
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

async function main() {
  await cleanup();
  if (process.argv.includes("--cleanup")) return;

  const password = `Phase5Entry-${randomUUID()}aA!`;
  const author = await createIdentity("author", password);
  const administrator = await createIdentity("admin", password);
  const journal = await prisma.journal.findUniqueOrThrow({
    where: { slug: "psychology" },
  });
  await prisma.user.createMany({
    data: [
      { id: author.id, displayName: `${displayPrefix}Author` },
      {
        id: administrator.id,
        displayName: `${displayPrefix}Administrator`,
      },
    ],
  });
  await prisma.userGlobalRole.create({
    data: { userId: author.id, role: "AUTHOR" },
  });
  await prisma.journalRoleAssignment.create({
    data: {
      userId: administrator.id,
      journalId: journal.id,
      role: "JOURNAL_ADMIN",
    },
  });
  await Promise.all([
    writeFile(receiptPath, "%PDF-1.4 Phase 5 entry receipt", { mode: 0o600 }),
    writeFile(manuscriptPath, "%PDF-1.4 Phase 5 entry manuscript", {
      mode: 0o600,
    }),
    writeFile(
      identityPath,
      JSON.stringify({
        author,
        administrator,
        receiptPath,
        manuscriptPath,
      }),
      { mode: 0o600 },
    ),
  ]);
  console.log(`Phase 5 entry-browser identities ready at ${identityPath}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
