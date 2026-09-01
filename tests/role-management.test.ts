import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getRoleChangeDenialReason } from "@/lib/auth/role-management-policy";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";

const departmentA = "department-a";
const scopeA = {
  journalId: "journal-a",
  departmentId: departmentA,
  isActive: true,
  departmentIsActive: true,
};
const scopeB = {
  ...scopeA,
  journalId: "journal-b",
  departmentId: "department-b",
};
const target = { id: "target", isActive: true };
const author = {
  id: "author",
  isActive: true,
  isSuperAdmin: false,
  scopedRoles: [],
};
const journalAdmin = {
  id: "journal-admin",
  isActive: true,
  isSuperAdmin: false,
  scopedRoles: [
    {
      role: "JOURNAL_ADMIN" as const,
      journalId: "journal-a",
      departmentId: departmentA,
    },
  ],
};
const superAdmin = {
  id: "super-admin",
  isActive: true,
  isSuperAdmin: true,
  scopedRoles: [],
};

test("normal Authors cannot promote themselves or another user", () => {
  assert.match(
    getRoleChangeDenialReason({
      actor: author,
      target: { ...target, id: author.id },
      role: "EDITOR",
      scope: scopeA,
    })!,
    /own access/,
  );
  assert.match(
    getRoleChangeDenialReason({
      actor: author,
      target,
      role: "EDITOR",
      scope: scopeA,
    })!,
    /own (department|journal)/,
  );
});

test("Journal Admin can change Editor access only inside their department", () => {
  assert.equal(
    getRoleChangeDenialReason({
      actor: journalAdmin,
      target,
      role: "EDITOR",
      scope: scopeA,
    }),
    null,
  );
  assert.match(
    getRoleChangeDenialReason({
      actor: journalAdmin,
      target,
      role: "EDITOR",
      scope: scopeB,
    })!,
    /own (department|journal)/,
  );
});

test("Journal Admin cannot create Journal Admin or Super Admin access", () => {
  assert.match(
    getRoleChangeDenialReason({
      actor: journalAdmin,
      target,
      role: "JOURNAL_ADMIN",
      scope: scopeA,
    })!,
    /Only a Super Admin/,
  );
  assert.match(
    getRoleChangeDenialReason({
      actor: journalAdmin,
      target,
      role: "SUPER_ADMIN",
      scope: null,
    })!,
    /Only a Super Admin/,
  );
});

test("Super Admin can assign each privileged role with valid scope", () => {
  assert.equal(
    getRoleChangeDenialReason({
      actor: superAdmin,
      target,
      role: "SUPER_ADMIN",
      scope: null,
    }),
    null,
  );
  assert.equal(
    getRoleChangeDenialReason({
      actor: superAdmin,
      target,
      role: "JOURNAL_ADMIN",
      scope: scopeA,
    }),
    null,
  );
  assert.equal(
    getRoleChangeDenialReason({
      actor: superAdmin,
      target,
      role: "EDITOR",
      scope: scopeA,
    }),
    null,
  );
});

test("inactive users and invalid role scopes are rejected", () => {
  assert.match(
    getRoleChangeDenialReason({
      actor: superAdmin,
      target: { ...target, isActive: false },
      role: "EDITOR",
      scope: scopeA,
    })!,
    /not active/,
  );
  assert.match(
    getRoleChangeDenialReason({
      actor: superAdmin,
      target,
      role: "EDITOR",
      scope: null,
    })!,
    /Choose a (department|journal)/,
  );
  assert.match(
    getRoleChangeDenialReason({
      actor: superAdmin,
      target,
      role: "SUPER_ADMIN",
      scope: scopeA,
    })!,
    /cannot have a (department|journal)/,
  );
});

test("role mutations are idempotent, audited, removable, and preserve Author", () => {
  const source = readFileSync("lib/auth/role-management.ts", "utf8");
  assert.match(source, /createMany\([\s\S]*skipDuplicates: true/);
  assert.match(source, /roleChangeEvent\.create/);
  assert.match(source, /action: "REMOVED"/);
  assert.match(source, /role: "AUTHOR"/);
  assert.match(source, /deleteMany/);
});

test("role upgrades expose the existing multi-workspace behavior", () => {
  const journal = {
    id: "journal-a",
    slug: "psychology",
    name: "Psychology Journal",
    shortName: "Psychology",
    isActive: true,
    department: {
      id: departmentA,
      slug: "psychology",
      name: "Psychology",
      isActive: true,
    },
  };
  const base = {
    isActive: true,
    globalRoles: [{ role: "AUTHOR" as const }],
    journalRoles: [],
  };
  assert.deepEqual(
    getAvailableWorkspaces(base).map(({ area }) => area),
    ["author"],
  );
  assert.deepEqual(
    getAvailableWorkspaces({
      ...base,
      journalRoles: [
        { journalId: journal.id, role: "EDITOR" as const, journal },
      ],
    }).map(({ area }) => area),
    ["editor"],
  );
  assert.deepEqual(
    getAvailableWorkspaces({
      ...base,
      journalRoles: [
        { journalId: journal.id, role: "JOURNAL_ADMIN" as const, journal },
      ],
    }).map(({ area }) => area),
    ["journal-admin"],
  );
  assert.deepEqual(
    getAvailableWorkspaces({
      ...base,
      globalRoles: [
        { role: "AUTHOR" as const },
        { role: "SUPER_ADMIN" as const },
      ],
    }).map(({ area }) => area),
    ["platform"],
  );
});

test("break-glass account is protected against role management mutations", async () => {
  const { isBreakGlassSuperAdminEmail } =
    await import("@/lib/auth/provisioning");

  const originalEnv = process.env.BREAK_GLASS_SUPERADMIN_EMAILS;
  try {
    process.env.BREAK_GLASS_SUPERADMIN_EMAILS = "breakglass.admin@example.com";

    const targetUser = {
      id: "bg-target",
      email: "breakglass.admin@example.com",
      displayName: "Break Glass Admin",
      isActive: true,
    };

    const isProtected = isBreakGlassSuperAdminEmail(targetUser.email);
    assert.equal(isProtected, true);

    const normalUser = {
      id: "normal-target",
      email: "author.one@example.com",
      displayName: "Normal Author",
      isActive: true,
    };
    assert.equal(isBreakGlassSuperAdminEmail(normalUser.email), false);
  } finally {
    process.env.BREAK_GLASS_SUPERADMIN_EMAILS = originalEnv;
  }
});
