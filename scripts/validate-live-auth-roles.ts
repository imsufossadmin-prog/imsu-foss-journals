import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

import { provisionAuthenticatedUser } from "../lib/auth/provisioning";
import {
  assignManagedRoleForActor,
  removeManagedRoleForActor,
  RoleManagementError,
} from "../lib/auth/role-management";
import { getAvailableWorkspaces } from "../lib/auth/workspaces";
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
const emailPrefix = "auth-role-live-";
const departmentSlug = "auth-role-live-department";
const journalSlug = "auth-role-live-journal";

async function authUsers() {
  const users: SupabaseUser[] = [];
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
  await prisma.journal.deleteMany({ where: { slug: journalSlug } });
  await prisma.department.deleteMany({ where: { slug: departmentSlug } });

  for (const user of await authUsers()) {
    if (user.email?.startsWith(emailPrefix)) {
      const removed = await service.auth.admin.deleteUser(user.id);
      assert.ifError(removed.error);
    }
  }
}

async function createIdentity(label: string) {
  const email = `${emailPrefix}${label}@example.test`;
  const created = await service.auth.admin.createUser({
    email,
    password: `AuthRole-${randomUUID()}aA!`,
    email_confirm: true,
    user_metadata: { full_name: `Auth Role ${label}` },
  });
  assert.ifError(created.error);
  assert(created.data.user);
  return { authUser: created.data.user, email };
}

async function main() {
  await cleanup();
  console.log("Live Google-role foundation validation started.");

  const [
    superIdentity,
    adminIdentity,
    editorIdentity,
    managerIdentity,
    inactiveIdentity,
  ] = await Promise.all([
    createIdentity("super-admin"),
    createIdentity("journal-admin"),
    createIdentity("editor-candidate"),
    createIdentity("admin-candidate"),
    createIdentity("inactive-candidate"),
  ]);
  const [superUser, journalAdmin, editor, manager, inactive] =
    await Promise.all(
      [
        superIdentity,
        adminIdentity,
        editorIdentity,
        managerIdentity,
        inactiveIdentity,
      ].map(({ authUser }) => provisionAuthenticatedUser(authUser)),
    );

  for (const user of [superUser, journalAdmin, editor, manager, inactive]) {
    assert.deepEqual(
      user.globalRoles.map(({ role }) => role),
      ["AUTHOR"],
    );
    assert.equal(user.journalRoles.length, 0);
  }
  const repeated = await provisionAuthenticatedUser(editorIdentity.authUser);
  assert.equal(repeated.id, editor.id);
  assert.deepEqual(
    repeated.globalRoles.map(({ role }) => role),
    ["AUTHOR"],
  );

  const psychology = await prisma.journal.findUniqueOrThrow({
    where: { slug: "psychology" },
    include: { department: true },
  });
  const otherDepartment = await prisma.department.create({
    data: {
      name: "Auth Role Live Department",
      slug: departmentSlug,
      journals: {
        create: {
          name: "Auth Role Live Journal",
          slug: journalSlug,
          isActive: true,
        },
      },
    },
    include: { journals: true },
  });
  const otherJournal = otherDepartment.journals[0];
  assert(otherJournal);

  await prisma.userGlobalRole.create({
    data: { userId: superUser.id, role: "SUPER_ADMIN" },
  });
  await prisma.journalRoleAssignment.create({
    data: {
      userId: journalAdmin.id,
      journalId: psychology.id,
      role: "JOURNAL_ADMIN",
    },
  });
  await prisma.user.update({
    where: { id: inactive.id },
    data: { isActive: false },
  });

  await assert.rejects(
    assignManagedRoleForActor(editor.id, {
      targetUserId: editor.id,
      role: "EDITOR",
      journalId: psychology.id,
    }),
    RoleManagementError,
  );
  await assert.rejects(
    assignManagedRoleForActor(editor.id, {
      targetUserId: manager.id,
      role: "EDITOR",
      journalId: psychology.id,
    }),
    RoleManagementError,
  );
  await assert.rejects(
    assignManagedRoleForActor(superUser.id, {
      targetUserId: inactive.id,
      role: "EDITOR",
      journalId: psychology.id,
    }),
    RoleManagementError,
  );

  const editorAssigned = await assignManagedRoleForActor(journalAdmin.id, {
    targetUserId: editor.id,
    role: "EDITOR",
    journalId: psychology.id,
  });
  assert.equal(editorAssigned.changed, true);
  const duplicate = await assignManagedRoleForActor(journalAdmin.id, {
    targetUserId: editor.id,
    role: "EDITOR",
    journalId: psychology.id,
  });
  assert.equal(duplicate.changed, false);
  await assert.rejects(
    assignManagedRoleForActor(journalAdmin.id, {
      targetUserId: editor.id,
      role: "EDITOR",
      journalId: otherJournal.id,
    }),
    RoleManagementError,
  );
  await assert.rejects(
    assignManagedRoleForActor(journalAdmin.id, {
      targetUserId: editor.id,
      role: "JOURNAL_ADMIN",
      journalId: psychology.id,
    }),
    RoleManagementError,
  );
  await assert.rejects(
    assignManagedRoleForActor(journalAdmin.id, {
      targetUserId: editor.id,
      role: "SUPER_ADMIN",
    }),
    RoleManagementError,
  );

  assert.equal(
    (
      await assignManagedRoleForActor(superUser.id, {
        targetUserId: manager.id,
        role: "JOURNAL_ADMIN",
        journalId: psychology.id,
      })
    ).changed,
    true,
  );
  assert.equal(
    (
      await assignManagedRoleForActor(superUser.id, {
        targetUserId: manager.id,
        role: "EDITOR",
        journalId: psychology.id,
      })
    ).changed,
    true,
  );

  const upgradedEditor = await prisma.user.findUniqueOrThrow({
    where: { id: editor.id },
    include: {
      globalRoles: true,
      journalRoles: { include: { journal: { include: { department: true } } } },
    },
  });
  assert.deepEqual(
    getAvailableWorkspaces(upgradedEditor).map(({ area }) => area),
    ["editor", "author"],
  );
  const upgradedManager = await prisma.user.findUniqueOrThrow({
    where: { id: manager.id },
    include: {
      globalRoles: true,
      journalRoles: { include: { journal: { include: { department: true } } } },
    },
  });
  assert.deepEqual(
    getAvailableWorkspaces(upgradedManager).map(({ area }) => area),
    ["journal-admin", "editor", "author"],
  );

  assert.equal(
    (
      await removeManagedRoleForActor(journalAdmin.id, {
        targetUserId: editor.id,
        role: "EDITOR",
        journalId: psychology.id,
      })
    ).changed,
    true,
  );
  assert.equal(
    (
      await removeManagedRoleForActor(superUser.id, {
        targetUserId: manager.id,
        role: "JOURNAL_ADMIN",
        journalId: psychology.id,
      })
    ).changed,
    true,
  );
  assert.equal(
    (
      await removeManagedRoleForActor(superUser.id, {
        targetUserId: manager.id,
        role: "EDITOR",
        journalId: psychology.id,
      })
    ).changed,
    true,
  );

  for (const userId of [editor.id, manager.id]) {
    const demoted = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { globalRoles: true, journalRoles: true },
    });
    assert(demoted.globalRoles.some(({ role }) => role === "AUTHOR"));
    assert.equal(demoted.journalRoles.length, 0);
  }
  assert.equal(
    await prisma.roleChangeEvent.count({
      where: {
        actorId: { in: [superUser.id, journalAdmin.id] },
        targetUserId: { in: [editor.id, manager.id] },
      },
    }),
    6,
  );

  console.log("Live role assignment, workspace refresh, and removal passed.");
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
