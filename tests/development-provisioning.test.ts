import assert from "node:assert/strict";
import test from "node:test";

import { GlobalRole, JournalRole } from "@prisma/client";

import {
  provisionDevelopmentUser,
  type DevelopmentApplicationProvisioningStore,
  type DevelopmentAuthProvisioningStore,
} from "@/lib/auth/development-provisioning";

class MemoryAuthStore implements DevelopmentAuthProvisioningStore {
  users = new Map<string, { id: string; password: string }>();
  creates = 0;

  async findUserIdByEmail(email: string) {
    return this.users.get(email)?.id ?? null;
  }

  async createUser(email: string, password: string) {
    this.creates += 1;
    const id = "870c7af3-5ab6-49cb-af35-78f1226ee3b9";
    this.users.set(email, { id, password });
    return id;
  }

  async updateUser(userId: string, password: string) {
    const entry = [...this.users.entries()].find(
      ([, user]) => user.id === userId,
    );
    assert(entry);
    this.users.set(entry[0], { id: userId, password });
  }
}

class MemoryApplicationStore implements DevelopmentApplicationProvisioningStore {
  users = new Map<string, { email: string; displayName: string }>();
  globalRoles = new Map<string, Set<GlobalRole>>();
  journalRoles = new Map<string, Set<string>>();
  failRequestedRoleOnce = false;

  async findJournalIdBySlug(slug: string) {
    return slug === "psychology" ? "journal-psychology" : null;
  }

  async upsertUser(input: { id: string; email: string; displayName: string }) {
    this.users.set(input.id, {
      email: input.email,
      displayName: input.displayName,
    });
  }

  async ensureGlobalRole(userId: string, role: GlobalRole) {
    if (role !== GlobalRole.AUTHOR && this.failRequestedRoleOnce) {
      this.failRequestedRoleOnce = false;
      throw new Error("simulated database interruption");
    }
    const roles = this.globalRoles.get(userId) ?? new Set<GlobalRole>();
    roles.add(role);
    this.globalRoles.set(userId, roles);
  }

  async ensureJournalRole(
    userId: string,
    journalId: string,
    role: JournalRole,
  ) {
    const roles = this.journalRoles.get(userId) ?? new Set<string>();
    roles.add(`${journalId}:${role}`);
    this.journalRoles.set(userId, roles);
  }
}

const input = {
  email: "development-admin@example.com",
  password: "development-password",
  displayName: "Development Administrator",
  role: GlobalRole.SUPER_ADMIN,
};

test("development provisioning is idempotent", async () => {
  const auth = new MemoryAuthStore();
  const application = new MemoryApplicationStore();

  const first = await provisionDevelopmentUser(input, { auth, application });
  const second = await provisionDevelopmentUser(input, { auth, application });

  assert.equal(second, first);
  assert.equal(auth.creates, 1);
  assert.equal(auth.users.size, 1);
  assert.equal(application.users.size, 1);
  assert.deepEqual(
    [...(application.globalRoles.get(first) ?? [])].sort(),
    [GlobalRole.AUTHOR, GlobalRole.SUPER_ADMIN].sort(),
  );
});

test("rerun recovers after Auth succeeds and a database role write fails", async () => {
  const auth = new MemoryAuthStore();
  const application = new MemoryApplicationStore();
  application.failRequestedRoleOnce = true;

  await assert.rejects(
    provisionDevelopmentUser(input, { auth, application }),
    /simulated database interruption/,
  );
  assert.equal(auth.users.size, 1);
  assert.equal(application.globalRoles.values().next().value?.size, 1);

  const userId = await provisionDevelopmentUser(input, { auth, application });

  assert.equal(auth.creates, 1);
  assert.equal(auth.users.size, 1);
  assert.equal(application.users.size, 1);
  assert.deepEqual(
    [...(application.globalRoles.get(userId) ?? [])].sort(),
    [GlobalRole.AUTHOR, GlobalRole.SUPER_ADMIN].sort(),
  );
});

test("journal roles require and reuse a valid journal scope", async () => {
  const auth = new MemoryAuthStore();
  const application = new MemoryApplicationStore();

  await assert.rejects(
    provisionDevelopmentUser(
      { ...input, role: JournalRole.EDITOR, journalSlug: "missing" },
      { auth, application },
    ),
    /Journal not found/,
  );
  assert.equal(auth.users.size, 0);

  const userId = await provisionDevelopmentUser(
    { ...input, role: JournalRole.EDITOR, journalSlug: "psychology" },
    { auth, application },
  );
  await provisionDevelopmentUser(
    { ...input, role: JournalRole.EDITOR, journalSlug: "psychology" },
    { auth, application },
  );

  assert.deepEqual(
    [...(application.journalRoles.get(userId) ?? [])],
    [`journal-psychology:${JournalRole.EDITOR}`],
  );
});
