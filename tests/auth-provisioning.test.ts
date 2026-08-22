import assert from "node:assert/strict";
import test from "node:test";

import type { ProvisionedApplicationUser } from "@/lib/auth/provisioning";
import {
  getAuthorProfileInput,
  provisionAuthenticatedUser,
  type AuthorProfileInput,
  type AuthorProvisioningStore,
} from "@/lib/auth/provisioning";

class MemoryProvisioningStore implements AuthorProvisioningStore {
  users = new Map<string, AuthorProfileInput>();
  roles = new Map<string, Set<string>>();

  async ensureAuthorProfile(input: AuthorProfileInput) {
    const existing = this.users.get(input.id);
    this.users.set(
      input.id,
      existing ? { ...existing, email: input.email } : input,
    );
    const roles = this.roles.get(input.id) ?? new Set<string>();
    roles.add("AUTHOR");
    this.roles.set(input.id, roles);
    const user = this.users.get(input.id)!;
    return {
      ...user,
      isActive: true,
      institution: null,
      department: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      globalRoles: [...roles].map((role) => ({
        id: role,
        userId: input.id,
        role,
        createdAt: new Date(),
      })),
      journalRoles: [],
    } as ProvisionedApplicationUser;
  }
}

const googleIdentity = {
  id: "870c7af3-5ab6-49cb-af35-78f1226ee3b9",
  email: "New.Author@Example.com",
  user_metadata: { full_name: "New Author", role: "SUPER_ADMIN" },
};

test("first Google login creates a User with basic Author access", async () => {
  const store = new MemoryProvisioningStore();
  const user = await provisionAuthenticatedUser(googleIdentity, store);

  assert.equal(store.users.size, 1);
  assert.equal(user.email, "new.author@example.com");
  assert.deepEqual(
    user.globalRoles.map(({ role }) => role),
    ["AUTHOR"],
  );
});

test("repeated Google login is idempotent and reuses the existing User", async () => {
  const store = new MemoryProvisioningStore();
  const first = await provisionAuthenticatedUser(googleIdentity, store);
  const second = await provisionAuthenticatedUser(googleIdentity, store);

  assert.equal(store.users.size, 1);
  assert.equal(store.roles.get(first.id)?.size, 1);
  assert.equal(second.id, first.id);
});

test("Google metadata never grants a privileged application role", async () => {
  const store = new MemoryProvisioningStore();
  const user = await provisionAuthenticatedUser(googleIdentity, store);
  const roles = user.globalRoles.map(({ role }) => role);

  assert(!roles.includes("SUPER_ADMIN"));
  assert.equal(user.journalRoles.length, 0);
});

test("trusted Google identity supplies normalized email and display name", () => {
  assert.deepEqual(getAuthorProfileInput(googleIdentity), {
    id: googleIdentity.id,
    email: "new.author@example.com",
    displayName: "New Author",
  });
});
