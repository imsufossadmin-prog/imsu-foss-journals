import assert from "node:assert/strict";
import test from "node:test";

import {
  getJournalDbSlugs,
  getJournalMetadata,
  getDefaultEditorialBoard,
  resolveCanonicalJournalSlug,
} from "@/lib/editorial/editorial-board-data";
import {
  addEditorialBoardMember,
  deleteEditorialBoardMember,
  getJournalEditorialBoard,
  resetEditorialBoard,
  updateEditorialBoardMember,
} from "@/lib/editorial/editorial-board-store";

test("Phase 2: Slug alias resolution maps legacy and canonical slugs properly", () => {
  assert.equal(resolveCanonicalJournalSlug("njcp"), "njcp");
  assert.equal(resolveCanonicalJournalSlug("psychology"), "njcp");
  assert.equal(resolveCanonicalJournalSlug("PSYCHOLOGY"), "njcp");

  assert.equal(resolveCanonicalJournalSlug("ajsbs"), "ajsbs");
  assert.equal(resolveCanonicalJournalSlug("AJSBS"), "ajsbs");

  assert.equal(resolveCanonicalJournalSlug("njsr"), "njsr");
  assert.equal(resolveCanonicalJournalSlug("njsbr"), "njsr");
  assert.equal(resolveCanonicalJournalSlug("NJSBR"), "njsr");

  assert.equal(resolveCanonicalJournalSlug("gjcsr"), "gjcsr");
  assert.equal(resolveCanonicalJournalSlug("gjsbr"), "gjcsr");
  assert.equal(resolveCanonicalJournalSlug("GJSBR"), "gjcsr");
});

test("Phase 2: Database slug mapper expands aliases for relation queries", () => {
  assert.deepEqual(getJournalDbSlugs("njcp"), ["njcp", "psychology"]);
  assert.deepEqual(getJournalDbSlugs("psychology"), ["njcp", "psychology"]);
  assert.deepEqual(getJournalDbSlugs("njsr"), ["njsr", "njsbr"]);
  assert.deepEqual(getJournalDbSlugs("gjcsr"), ["gjcsr", "gjsbr"]);
  assert.deepEqual(getJournalDbSlugs("ajsbs"), ["ajsbs"]);
});

test("Phase 2: Exact Institutional Editorial Board for Nigerian Journal of Contemporary Psychology (NJCP)", () => {
  const meta = getJournalMetadata("njcp");
  assert.ok(meta);
  assert.equal(meta.title, "Nigerian Journal of Contemporary Psychology");
  assert.equal(meta.shortName, "NJCP");
  assert.equal(meta.department, "Department of Psychology");

  const board = getDefaultEditorialBoard("njcp");
  assert.ok(board.length >= 14);

  // Chief Editor
  const chief = board.find((m) => m.category === "CHIEF_EDITOR");
  assert.ok(chief);
  assert.equal(chief.name, "Prof Nkwam C. Uwaoma");
  assert.equal(chief.role, "Chief Editor");

  // Deputy Editor
  const deputy = board.find((m) => m.category === "DEPUTY_EDITOR");
  assert.ok(deputy);
  assert.equal(deputy.name, "Ethelbert Njoku PhD");

  // Associate Editor
  const assoc = board.find((m) => m.category === "ASSOCIATE_EDITOR");
  assert.ok(assoc);
  assert.equal(assoc.name, "Ann Ukachi Madukwe PhD");

  // Managing Editor
  const managing = board.find((m) => m.category === "MANAGING_EDITOR");
  assert.ok(managing);
  assert.equal(managing.name, "Richards E. Ebeh, PhD");

  // Editorial Board Members
  const boardMemberNames = board
    .filter((m) => m.category === "BOARD_MEMBER")
    .map((m) => m.name);
  assert.ok(boardMemberNames.includes("Prof Charles I. Mbaeze"));
  assert.ok(boardMemberNames.includes("Prof Cletus N. Offor"));
  assert.ok(boardMemberNames.includes("Ngozi Sydney-Agbor, PhD"));
  assert.ok(boardMemberNames.includes("Leonard C. Onwukwe, PhD"));
  assert.ok(boardMemberNames.includes("Helen Ihuoma Nnamdi-Annozie, PhD"));
  assert.ok(boardMemberNames.includes("Miracle Ifeoma Mbagwu, PhD"));

  // Consulting Editors
  const consultingNames = board
    .filter((m) => m.category === "CONSULTING_EDITOR")
    .map((m) => m.name);
  assert.ok(consultingNames.includes("Prof R.N. Ugokwe-Ossai"));
  assert.ok(consultingNames.includes("Prof Benjamin O. Ehighie"));
  assert.ok(consultingNames.includes("Prof Ike Ernest Onyishi"));
  assert.ok(consultingNames.includes("Prof Nnamdi Obikeze"));
});

test("Phase 2: Default editorial board configurations for AJSBS, NJSR, GJCSR", () => {
  const ajsbsBoard = getDefaultEditorialBoard("ajsbs");
  assert.ok(ajsbsBoard.length > 0);
  assert.equal(
    ajsbsBoard.find((m) => m.category === "CHIEF_EDITOR")?.name,
    "Prof. Ikechukwu J.D. Nwosu",
  );

  const njsrBoard = getDefaultEditorialBoard("njsr");
  assert.ok(njsrBoard.length > 0);
  assert.equal(
    njsrBoard.find((m) => m.category === "CHIEF_EDITOR")?.name,
    "Prof. Nkwam C. Uwaoma",
  );

  const gjcsrBoard = getDefaultEditorialBoard("gjcsr");
  assert.ok(gjcsrBoard.length > 0);
  assert.equal(
    gjcsrBoard.find((m) => m.category === "CHIEF_EDITOR")?.name,
    "Prof. B.T.O. Ikegwuoha",
  );
});

test("Phase 2: Editorial board store supports adding, editing, deleting, and resetting members safely", async () => {
  const superAdminActor = {
    id: "admin-1",
    email: "superadmin@imsu-foss.ng",
    globalRoles: [
      { role: "SUPER_ADMIN" as const },
      { role: "AUTHOR" as const },
    ],
    journalRoles: [],
  };

  const initialBoard = await getJournalEditorialBoard("njcp");
  const initialCount = initialBoard.length;

  // 1. Add member
  const addRes = await addEditorialBoardMember({
    journalSlug: "njcp",
    name: "Dr. Test Guest Scholar",
    role: "Visiting Research Fellow",
    affiliation: "University of Cambridge",
    category: "CONSULTING_EDITOR",
    actor: superAdminActor,
  });

  assert.equal(addRes.success, true);
  assert.ok(addRes.member);

  const updatedBoard = await getJournalEditorialBoard("njcp");
  assert.equal(updatedBoard.length, initialCount + 1);
  const added = updatedBoard.find((m) => m.id === addRes.member?.id);
  assert.ok(added);
  assert.equal(added.name, "Dr. Test Guest Scholar");

  // 2. Update member
  const updateRes = await updateEditorialBoardMember({
    journalSlug: "njcp",
    memberId: added.id,
    name: "Prof. Test Guest Scholar Updated",
    role: "Senior Visiting Professor",
    affiliation: "University of Oxford",
    category: "CONSULTING_EDITOR",
    actor: superAdminActor,
  });
  assert.equal(updateRes.success, true);

  const boardAfterUpdate = await getJournalEditorialBoard("njcp");
  const updatedItem = boardAfterUpdate.find((m) => m.id === added.id);
  assert.equal(updatedItem?.name, "Prof. Test Guest Scholar Updated");

  // 3. Delete member
  const deleteRes = await deleteEditorialBoardMember({
    journalSlug: "njcp",
    memberId: added.id,
    actor: superAdminActor,
  });
  assert.equal(deleteRes.success, true);

  const boardAfterDelete = await getJournalEditorialBoard("njcp");
  assert.equal(boardAfterDelete.length, initialCount);

  // 4. Reset board
  const resetRes = await resetEditorialBoard({
    journalSlug: "njcp",
    actor: superAdminActor,
  });
  assert.equal(resetRes.success, true);
});

test("Phase 2: Journal metadata overrides and public homepage display toggle", async () => {
  const {
    getJournalMetadataWithOverrides,
    updateJournalCustomMetadata,
    resetJournalMetadata,
  } = await import("@/lib/editorial/editorial-board-store");

  const superAdminActor = {
    id: "admin-1",
    email: "superadmin@imsu-foss.ng",
    globalRoles: [
      { role: "SUPER_ADMIN" as const },
      { role: "AUTHOR" as const },
    ],
    journalRoles: [],
  };

  // Reset metadata to ensure clean starting state
  await resetJournalMetadata({
    journalSlug: "njcp",
    actor: superAdminActor,
  });

  // Base metadata has showMetadataOnHomepage = false by default
  const baseMeta = await getJournalMetadataWithOverrides("njcp");
  assert.ok(baseMeta);
  assert.equal(baseMeta.showMetadataOnHomepage, false);

  // Update metadata with custom ISSN and enable homepage display toggle
  const updateRes = await updateJournalCustomMetadata({
    journalSlug: "njcp",
    metadata: {
      issnPrint: "2736-0814",
      issnOnline: "2736-0822",
      frequency: "Quarterly",
      referencingStyle: "APA 7th Edition",
      showMetadataOnHomepage: true,
    },
    actor: superAdminActor,
  });

  assert.equal(updateRes.success, true);
  assert.ok(updateRes.updated);
  assert.equal(updateRes.updated.showMetadataOnHomepage, true);
  assert.equal(updateRes.updated.issnPrint, "2736-0814");
  assert.equal(updateRes.updated.issnOnline, "2736-0822");
  assert.equal(updateRes.updated.frequency, "Quarterly");

  // Verify getJournalMetadataWithOverrides returns updated values
  const updatedMeta = await getJournalMetadataWithOverrides("njcp");
  assert.ok(updatedMeta);
  assert.equal(updatedMeta.showMetadataOnHomepage, true);
  assert.equal(updatedMeta.issnPrint, "2736-0814");
  assert.equal(updatedMeta.issnOnline, "2736-0822");
  assert.equal(updatedMeta.frequency, "Quarterly");

  // 1-Click Instant Visibility Toggle ON
  const { toggleJournalMetadataVisibility } =
    await import("@/lib/editorial/editorial-board-store");
  const instantToggleOnRes = await toggleJournalMetadataVisibility({
    journalSlug: "njcp",
    isVisible: true,
    actor: superAdminActor,
  });
  assert.equal(instantToggleOnRes.success, true);
  assert.equal(instantToggleOnRes.isVisible, true);

  const metaAfterInstantOn = await getJournalMetadataWithOverrides("njcp");
  assert.equal(metaAfterInstantOn.showMetadataOnHomepage, true);

  // 1-Click Instant Visibility Toggle OFF
  const instantToggleOffRes = await toggleJournalMetadataVisibility({
    journalSlug: "njcp",
    isVisible: false,
    actor: superAdminActor,
  });
  assert.equal(instantToggleOffRes.success, true);
  assert.equal(instantToggleOffRes.isVisible, false);

  const metaAfterInstantOff = await getJournalMetadataWithOverrides("njcp");
  assert.equal(metaAfterInstantOff.showMetadataOnHomepage, false);
});

test("Phase 2 & Phase 8: Department-scoped authorization enforces boundary on metadata & board mutations", async () => {
  const {
    isAuthorizedForJournal,
    updateJournalCustomMetadata,
    addEditorialBoardMember,
  } = await import("@/lib/editorial/editorial-board-store");

  const psychologyAdminActor = {
    id: "admin-psych",
    email: "psychadmin@imsu-foss.ng",
    globalRoles: [{ role: "AUTHOR" as const }],
    journalRoles: [
      {
        journalId: "njcp",
        role: "JOURNAL_ADMIN" as const,
        journal: { slug: "njcp" },
      },
    ],
  };

  const authorActor = {
    id: "author-1",
    email: "author@gmail.com",
    globalRoles: [{ role: "AUTHOR" as const }],
    journalRoles: [],
  };

  // 1. Check helper
  assert.equal(isAuthorizedForJournal(psychologyAdminActor, "njcp"), true);
  assert.equal(isAuthorizedForJournal(psychologyAdminActor, "ajsbs"), false);
  assert.equal(isAuthorizedForJournal(authorActor, "njcp"), false);

  // 2. Psychology admin can update NJCP metadata
  const allowedRes = await updateJournalCustomMetadata({
    journalSlug: "njcp",
    metadata: {
      issnPrint: "2736-0814",
      showMetadataOnHomepage: true,
    },
    actor: psychologyAdminActor,
  });
  assert.equal(allowedRes.success, true);

  // 3. Psychology admin is DENIED updating AJSBS metadata
  const deniedMetaRes = await updateJournalCustomMetadata({
    journalSlug: "ajsbs",
    metadata: {
      issnPrint: "9999-9999",
      showMetadataOnHomepage: true,
    },
    actor: psychologyAdminActor,
  });
  assert.equal(deniedMetaRes.success, false);
  assert.ok(deniedMetaRes.error?.includes("Unauthorized"));

  // 4. Psychology admin is DENIED adding board members to AJSBS
  const deniedBoardRes = await addEditorialBoardMember({
    journalSlug: "ajsbs",
    name: "Dr. Hacker",
    role: "Intruder",
    affiliation: "Unknown",
    category: "BOARD_MEMBER",
    actor: psychologyAdminActor,
  });
  assert.equal(deniedBoardRes.success, false);
  assert.ok(deniedBoardRes.error?.includes("Unauthorized"));
});

test("Navbar streamlining and footer navigation consistency", async () => {
  const { siteConfig } = await import("@/lib/config/site");

  const topNavLabels = siteConfig.publicNavigation.map((item) => item.label);
  assert.deepEqual(topNavLabels, [
    "Home",
    "Journals",
    "Archives",
    "Announcements",
    "Submissions",
  ]);

  const footerLabels = siteConfig.footerNavigation.map((item) => item.label);
  assert.deepEqual(footerLabels, [
    "Home",
    "About",
    "Editorial Board",
    "Announcements",
    "Current Issue",
    "Archives",
    "Submissions",
    "Apply as a Reviewer",
    "Contact",
  ]);
});
