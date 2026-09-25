import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_JOURNAL_ORDER,
  getJournalDbSlugs,
  getJournalMetadata,
  getDefaultEditorialBoard,
  resolveCanonicalJournalSlug,
  sortJournalsByCanonicalOrder,
} from "@/lib/editorial/editorial-board-data";
import {
  addEditorialBoardMember,
  deleteEditorialBoardMember,
  getJournalEditorialBoard,
  isAuthorizedForJournal,
  resetEditorialBoard,
  updateEditorialBoardMember,
} from "@/lib/editorial/editorial-board-store";

test("Canonical journal ordering enforces AJSBS first and NJCP last across platform", () => {
  assert.equal(CANONICAL_JOURNAL_ORDER[0], "ajsbs");
  assert.ok(CANONICAL_JOURNAL_ORDER.includes("njcp"));
  assert.ok(
    CANONICAL_JOURNAL_ORDER.indexOf("ajsbs") <
      CANONICAL_JOURNAL_ORDER.indexOf("njsr"),
  );
  assert.ok(
    CANONICAL_JOURNAL_ORDER.indexOf("njsr") <
      CANONICAL_JOURNAL_ORDER.indexOf("gjcsr"),
  );
  assert.ok(
    CANONICAL_JOURNAL_ORDER.indexOf("gjcsr") <
      CANONICAL_JOURNAL_ORDER.indexOf("njcp"),
  );

  const rawList = [
    {
      slug: "njcp",
      name: "Nigerian Journal of Contemporary Psychology (NJCP)",
    },
    {
      slug: "gjcsr",
      name: "Global Journal of Contemporary Social Research (GJCSR)",
    },
    {
      slug: "ajsbs",
      name: "African Journal of Social and Behavioural Sciences (AJSBS)",
    },
    { slug: "njsr", name: "Nwaebere Journal of Scientific Research (NJSR)" },
  ];

  const sorted = sortJournalsByCanonicalOrder(rawList);
  assert.deepEqual(
    sorted.map((j) => j.slug),
    ["ajsbs", "njsr", "gjcsr", "njcp"],
  );
});

test("Slug alias resolution maps legacy and canonical slugs properly", () => {
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

test("Database slug mapper expands aliases for relation queries", () => {
  assert.deepEqual(getJournalDbSlugs("njcp"), ["njcp", "psychology"]);
  assert.deepEqual(getJournalDbSlugs("psychology"), ["njcp", "psychology"]);
  assert.deepEqual(getJournalDbSlugs("njsr"), ["njsr", "njsbr"]);
  assert.deepEqual(getJournalDbSlugs("gjcsr"), ["gjcsr", "gjsbr"]);
  assert.deepEqual(getJournalDbSlugs("ajsbs"), ["ajsbs"]);
});

test("Institutional Journal Metadata and ISSN isolation (Only AJSBS has registered ISSN & ISSN-L)", () => {
  // AJSBS: African Journal of Social and Behavioural Sciences
  const ajsbsMeta = getJournalMetadata("ajsbs");
  assert.ok(ajsbsMeta);
  assert.equal(
    ajsbsMeta.title,
    "African Journal of Social and Behavioural Sciences",
  );
  assert.equal(ajsbsMeta.shortName, "AJSBS");
  assert.equal(ajsbsMeta.issnPrint, "2141-209X");
  assert.equal(ajsbsMeta.issnOnline, "2141-209X");
  assert.equal(ajsbsMeta.issnL, "2141-209X");

  // NJCP: Nigerian Journal of Contemporary Psychology (No ISSN)
  const njcpMeta = getJournalMetadata("njcp");
  assert.ok(njcpMeta);
  assert.equal(njcpMeta.title, "Nigerian Journal of Contemporary Psychology");
  assert.equal(njcpMeta.shortName, "NJCP");
  assert.equal(njcpMeta.issnPrint, undefined);
  assert.equal(njcpMeta.issnOnline, undefined);
  assert.equal(njcpMeta.issnL, undefined);

  // NJSR: Nwaebere Journal of Scientific Research (No ISSN)
  const njsrMeta = getJournalMetadata("njsr");
  assert.ok(njsrMeta);
  assert.equal(njsrMeta.title, "Nwaebere Journal of Scientific Research");
  assert.equal(njsrMeta.shortName, "NJSR");
  assert.equal(njsrMeta.issnPrint, undefined);
  assert.equal(njsrMeta.issnOnline, undefined);
  assert.equal(njsrMeta.issnL, undefined);

  // GJCSR: Global Journal of Contemporary Social Research (No ISSN)
  const gjcsrMeta = getJournalMetadata("gjcsr");
  assert.ok(gjcsrMeta);
  assert.equal(
    gjcsrMeta.title,
    "Global Journal of Contemporary Social Research",
  );
  assert.equal(gjcsrMeta.shortName, "GJCSR");
  assert.equal(gjcsrMeta.issnPrint, undefined);
  assert.equal(gjcsrMeta.issnOnline, undefined);
  assert.equal(gjcsrMeta.issnL, undefined);
});

test("Exact Institutional Editorial Board for Nigerian Journal of Contemporary Psychology (NJCP)", () => {
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

test("Default editorial board configurations for AJSBS, NJSR, GJCSR", () => {
  const ajsbsBoard = getDefaultEditorialBoard("ajsbs");
  assert.ok(ajsbsBoard.length > 0);
  assert.equal(
    ajsbsBoard.find((m) => m.category === "CHIEF_EDITOR")?.name,
    "Prof. Ikechukwu J.D. Nwosu",
  );

  const njsrBoard = getDefaultEditorialBoard("njsr");
  assert.equal(njsrBoard.length, 14);
  assert.equal(
    njsrBoard.find((m) => m.category === "CHIEF_EDITOR")?.name,
    "Prof Okee Okoro",
  );
  assert.equal(
    njsrBoard.find((m) => m.category === "DEPUTY_EDITOR")?.name,
    "Leonard C. Onwukwe, PhD",
  );
  assert.equal(
    njsrBoard.find((m) => m.category === "MANAGING_EDITOR")?.name,
    "Richards E. Ebeh, PhD",
  );

  const gjcsrBoard = getDefaultEditorialBoard("gjcsr");
  assert.equal(gjcsrBoard.length, 13);
  assert.equal(
    gjcsrBoard.find((m) => m.category === "CHIEF_EDITOR")?.name,
    "Prof Nkwam C. Uwaoma",
  );
  assert.equal(
    gjcsrBoard.find((m) => m.category === "DEPUTY_EDITOR")?.name,
    "Chinedu N. Nwokorie, PhD",
  );
  assert.equal(
    gjcsrBoard.find((m) => m.category === "MANAGING_EDITOR")?.name,
    "Richards E. Ebeh, PhD",
  );
});

test("Editorial board store supports adding, editing, deleting, and resetting members safely", async () => {
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

test("Department-scoped authorization enforces boundary on governance mutations", async () => {
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

  // 2. Psychology admin can add board member to NJCP
  const allowedRes = await addEditorialBoardMember({
    journalSlug: "njcp",
    name: "Dr. Psychology Fellow",
    role: "Editorial Assistant",
    affiliation: "IMSU Psychology",
    category: "BOARD_MEMBER",
    actor: psychologyAdminActor,
  });
  assert.equal(allowedRes.success, true);

  // Clean up
  if (allowedRes.member) {
    await deleteEditorialBoardMember({
      journalSlug: "njcp",
      memberId: allowedRes.member.id,
      actor: psychologyAdminActor,
    });
  }

  // 3. Psychology admin is DENIED adding board members to AJSBS
  const deniedBoardRes = await addEditorialBoardMember({
    journalSlug: "ajsbs",
    name: "Dr. Intruder",
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
