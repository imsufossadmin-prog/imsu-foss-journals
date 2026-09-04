import assert from "node:assert/strict";
import test from "node:test";

import {
  isJournalActivated,
  isLeadSystemOwner,
  isProtectedBreakGlassUser,
  MemoryJournalActivationStore,
  setJournalOperationalState,
} from "@/lib/editorial/journal-activation";

// Setup environment variable for test
process.env.BREAK_GLASS_SUPERADMIN_EMAILS = "martinzkizitto@gmail.com";

const breakGlassSuperAdmin = {
  id: "bg-admin-1",
  email: "martinzkizitto@gmail.com",
  globalRoles: [{ role: "SUPER_ADMIN" as const }, { role: "AUTHOR" as const }],
  journalRoles: [],
};

const leadOwnerAlternate = {
  id: "bg-admin-2",
  email: "martinzkiziztto@gmail.com",
  globalRoles: [{ role: "SUPER_ADMIN" as const }, { role: "AUTHOR" as const }],
  journalRoles: [],
};

const operationalSuperAdmin = {
  id: "op-admin-1",
  email: "imsufossadmin@gmail.com",
  globalRoles: [{ role: "SUPER_ADMIN" as const }, { role: "AUTHOR" as const }],
  journalRoles: [],
};

const regularSuperAdmin = {
  id: "reg-admin-1",
  email: "regular.superadmin@example.com",
  globalRoles: [{ role: "SUPER_ADMIN" as const }, { role: "AUTHOR" as const }],
  journalRoles: [],
};

const journalAdmin = {
  id: "ja-1",
  email: "ja.economics@imsufoss.org",
  globalRoles: [{ role: "AUTHOR" as const }],
  journalRoles: [{ journalId: "econ-id", role: "JOURNAL_ADMIN" as const }],
};

const editorUser = {
  id: "editor-1",
  email: "editor.economics@imsufoss.org",
  globalRoles: [{ role: "AUTHOR" as const }],
  journalRoles: [{ journalId: "econ-id", role: "EDITOR" as const }],
};

const authorUser = {
  id: "author-1",
  email: "demo.author1@imsufoss.org",
  globalRoles: [{ role: "AUTHOR" as const }],
  journalRoles: [],
};

test("initially active journals (Psychology, AJSBS, GJSBR, NJSBR) are operational by default", async () => {
  const store = new MemoryJournalActivationStore();
  assert.equal(await isJournalActivated("psychology", store), true);
  assert.equal(await isJournalActivated("PSYCHOLOGY", store), true);
  assert.equal(await isJournalActivated("ajsbs", store), true);
  assert.equal(await isJournalActivated("AJSBS", store), true);
  assert.equal(await isJournalActivated("gjsbr", store), true);
  assert.equal(await isJournalActivated("njsbr", store), true);
});

test("faculty journals with null departments are never locked", async () => {
  const store = new MemoryJournalActivationStore();
  assert.equal(await isJournalActivated("ajsbs", store), true);
  assert.equal(await isJournalActivated("gjsbr", store), true);
  assert.equal(await isJournalActivated("njsbr", store), true);
});

test("departmental journals are gated initially", async () => {
  const store = new MemoryJournalActivationStore();
  assert.equal(await isJournalActivated("economics", store), false);
  assert.equal(await isJournalActivated("sociology", store), false);
  assert.equal(await isJournalActivated("public-administration", store), false);
  assert.equal(
    await isJournalActivated("criminology-security-studies", store),
    false,
  );
  assert.equal(
    await isJournalActivated("library-information-science", store),
    false,
  );
});

test("isLeadSystemOwner strictly identifies Martinz Kizito lead owner accounts only", () => {
  assert.equal(isLeadSystemOwner(breakGlassSuperAdmin), true);
  assert.equal(isLeadSystemOwner(leadOwnerAlternate), true);
  assert.equal(isLeadSystemOwner(operationalSuperAdmin), false);
  assert.equal(isLeadSystemOwner(regularSuperAdmin), false);
  assert.equal(isLeadSystemOwner(journalAdmin), false);
  assert.equal(isLeadSystemOwner(editorUser), false);
  assert.equal(isLeadSystemOwner(authorUser), false);
});

test("isProtectedBreakGlassUser strictly identifies configured break-glass account", () => {
  assert.equal(isProtectedBreakGlassUser(breakGlassSuperAdmin), true);
  assert.equal(isProtectedBreakGlassUser(leadOwnerAlternate), true);
  assert.equal(isProtectedBreakGlassUser(operationalSuperAdmin), false);
  assert.equal(isProtectedBreakGlassUser(regularSuperAdmin), false);
  assert.equal(isProtectedBreakGlassUser(journalAdmin), false);
  assert.equal(isProtectedBreakGlassUser(editorUser), false);
  assert.equal(isProtectedBreakGlassUser(authorUser), false);
});

test("operational Super Admin (imsufossadmin) is denied from activating a gated journal", async () => {
  const store = new MemoryJournalActivationStore();
  const res = await setJournalOperationalState({
    journalSlug: "economics",
    enabled: true,
    actor: operationalSuperAdmin,
    store,
  });

  assert.equal(res.success, false);
  assert.match(res.error ?? "", /Only the Lead System Owner/);
  assert.equal(await isJournalActivated("economics", store), false);
});

test("regular Super Admin is denied from activating a gated journal", async () => {
  const store = new MemoryJournalActivationStore();
  const res = await setJournalOperationalState({
    journalSlug: "economics",
    enabled: true,
    actor: regularSuperAdmin,
    store,
  });

  assert.equal(res.success, false);
  assert.match(res.error ?? "", /Only the Lead System Owner/);
  assert.equal(await isJournalActivated("economics", store), false);
});

test("Journal Admin, Editor, and Author are denied from activating a gated journal", async () => {
  const store = new MemoryJournalActivationStore();

  const jaRes = await setJournalOperationalState({
    journalSlug: "economics",
    enabled: true,
    actor: journalAdmin,
    store,
  });
  assert.equal(jaRes.success, false);

  const editorRes = await setJournalOperationalState({
    journalSlug: "economics",
    enabled: true,
    actor: editorUser,
    store,
  });
  assert.equal(editorRes.success, false);

  const authorRes = await setJournalOperationalState({
    journalSlug: "economics",
    enabled: true,
    actor: authorUser,
    store,
  });
  assert.equal(authorRes.success, false);

  assert.equal(await isJournalActivated("economics", store), false);
});

test("break-glass Super Admin can activate a gated journal and state persists in store", async () => {
  const store = new MemoryJournalActivationStore();
  assert.equal(await isJournalActivated("economics", store), false);

  const res = await setJournalOperationalState({
    journalSlug: "economics",
    enabled: true,
    actor: breakGlassSuperAdmin,
    store,
  });

  assert.equal(res.success, true);
  assert.equal(await isJournalActivated("economics", store), true);
  assert.equal(await isJournalActivated("ECONOMICS", store), true);
});

test("baseline operational journals cannot be gated/deactivated", async () => {
  const store = new MemoryJournalActivationStore();
  const res = await setJournalOperationalState({
    journalSlug: "psychology",
    enabled: false,
    actor: breakGlassSuperAdmin,
    store,
  });

  assert.equal(res.success, false);
  assert.match(
    res.error ?? "",
    /Baseline operational journals cannot be gated/,
  );
  assert.equal(await isJournalActivated("psychology", store), true);
});

test("break-glass Super Admin can deactivate a previously activated non-baseline journal", async () => {
  const store = new MemoryJournalActivationStore();
  await store.activate("sociology");
  assert.equal(await isJournalActivated("sociology", store), true);

  const res = await setJournalOperationalState({
    journalSlug: "sociology",
    enabled: false,
    actor: breakGlassSuperAdmin,
    store,
  });

  assert.equal(res.success, true);
  assert.equal(await isJournalActivated("sociology", store), false);
});
