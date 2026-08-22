import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

import { prisma } from "../lib/db/prisma";

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
const identityPath = "/tmp/imsu-auth-role-browser.json";
const emailPrefix = "auth-role-browser-";

async function listedAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const listed = await service.auth.admin.listUsers({ page, perPage: 100 });
    assert.ifError(listed.error);
    users.push(...listed.data.users);
    if (listed.data.users.length < 100) return users;
  }
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: emailPrefix } },
    select: { id: true },
  });
  const ids = users.map(({ id }) => id);
  await prisma.roleChangeEvent.deleteMany({
    where: { OR: [{ actorId: { in: ids } }, { targetUserId: { in: ids } }] },
  });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  for (const user of await listedAuthUsers()) {
    if (user.email?.startsWith(emailPrefix)) {
      const removed = await service.auth.admin.deleteUser(user.id);
      assert.ifError(removed.error);
    }
  }
  await rm(identityPath, { force: true });
}

async function createIdentity(
  label: string,
  displayName: string,
  password: string,
) {
  const email = `${emailPrefix}${label}@example.test`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  });
  assert.ifError(created.error);
  assert(created.data.user);
  await prisma.user.create({
    data: {
      id: created.data.user.id,
      email,
      displayName,
      globalRoles: { create: { role: "AUTHOR" } },
    },
  });
  return { id: created.data.user.id, email, password };
}

async function main() {
  await cleanup();
  if (process.argv.includes("--cleanup")) return;

  const password = `AuthRoleBrowser-${randomUUID()}aA!`;
  const superAdmin = await createIdentity(
    "super-admin",
    "Auth Role Super Admin",
    password,
  );
  const journalAdmin = await createIdentity(
    "journal-admin",
    "Auth Role Journal Admin",
    password,
  );
  const editorCandidate = await createIdentity(
    "editor-candidate",
    "Auth Role Editor Candidate",
    password,
  );
  const adminCandidate = await createIdentity(
    "admin-candidate",
    "Auth Role Admin Candidate",
    password,
  );
  const psychology = await prisma.journal.findUniqueOrThrow({
    where: { slug: "psychology" },
  });
  await prisma.userGlobalRole.create({
    data: { userId: superAdmin.id, role: "SUPER_ADMIN" },
  });
  await prisma.journalRoleAssignment.create({
    data: {
      userId: journalAdmin.id,
      journalId: psychology.id,
      role: "JOURNAL_ADMIN",
    },
  });
  await writeFile(
    identityPath,
    JSON.stringify({
      superAdmin,
      journalAdmin,
      editorCandidate,
      adminCandidate,
    }),
    { mode: 0o600 },
  );
  console.log(`Auth-role browser identities ready at ${identityPath}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
