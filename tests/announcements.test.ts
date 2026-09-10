import assert from "node:assert/strict";
import test from "node:test";

import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementBySlug,
  getPublicAnnouncements,
  resetAnnouncements,
  toggleAnnouncementActive,
  updateAnnouncement,
} from "@/lib/editorial/announcements-store";

const superAdminActor = {
  id: "admin-super",
  email: "superadmin@imsu-foss.ng",
  globalRoles: [{ role: "SUPER_ADMIN" as const }],
  journalRoles: [],
};

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

test("Announcements: Public retrieval and filtering", async () => {
  resetAnnouncements();
  const publicAnnouncements = await getPublicAnnouncements();
  assert.ok(Array.isArray(publicAnnouncements));
  assert.ok(publicAnnouncements.length >= 3);
  assert.ok(publicAnnouncements.every((a) => a.isActive));

  // Filter by journal
  const njcpAnnouncements = await getPublicAnnouncements("njcp");
  assert.ok(
    njcpAnnouncements.every(
      (a) => a.targetJournal === "njcp" || a.targetJournal === "ALL",
    ),
  );

  // Retrieve single announcement by slug
  const first = publicAnnouncements[0];
  const bySlug = await getAnnouncementBySlug(first.slug);
  assert.ok(bySlug);
  assert.equal(bySlug.id, first.id);
});

test("Announcements: Creation, authorization, and updates", async () => {
  // 1. Author cannot create announcement
  const authorCreateRes = await createAnnouncement({
    title: "Unauthorized Call",
    category: "CALL_FOR_PAPERS",
    targetJournal: "njcp",
    content: "Some content here for testing unauthorized creation.",
    authorName: "Author",
    actor: authorActor,
  });
  assert.equal(authorCreateRes.success, false);
  assert.ok(authorCreateRes.error?.includes("Unauthorized"));

  // 2. Psychology admin can create NJCP announcement
  const createRes = await createAnnouncement({
    title: "NJCP 2026 Special Call for Cognitive Studies",
    category: "SPECIAL_ISSUE",
    targetJournal: "njcp",
    content:
      "We welcome submissions exploring cognitive behavioral interventions in Nigerian tertiary institutions.",
    authorName: "Prof Nkwam C. Uwaoma",
    actor: psychologyAdminActor,
  });
  assert.equal(createRes.success, true);
  assert.ok(createRes.announcement);
  const createdId = createRes.announcement!.id;

  // 3. Psychology admin CANNOT edit AJSBS announcement
  const ajsbsCreateRes = await createAnnouncement({
    title: "AJSBS Flagship Conference 2026",
    category: "GENERAL",
    targetJournal: "ajsbs",
    content: "Annual social science symposium registration.",
    authorName: "Dean of Faculty",
    actor: superAdminActor,
  });
  assert.equal(ajsbsCreateRes.success, true);
  const ajsbsId = ajsbsCreateRes.announcement!.id;

  const psychEditDenied = await updateAnnouncement({
    announcementId: ajsbsId,
    title: "Hacked Title",
    category: "GENERAL",
    targetJournal: "ajsbs",
    content: "Unauthorized content",
    isActive: true,
    actor: psychologyAdminActor,
  });
  assert.equal(psychEditDenied.success, false);
  assert.ok(psychEditDenied.error?.includes("Unauthorized"));

  // 4. Toggle active status
  const toggleRes = await toggleAnnouncementActive({
    announcementId: createdId,
    actor: psychologyAdminActor,
  });
  assert.equal(toggleRes.success, true);
  assert.equal(toggleRes.isActive, false);

  // 5. Cleanup / deletion
  const deleteRes = await deleteAnnouncement({
    announcementId: createdId,
    actor: psychologyAdminActor,
  });
  assert.equal(deleteRes.success, true);

  const deleteAjsbsRes = await deleteAnnouncement({
    announcementId: ajsbsId,
    actor: superAdminActor,
  });
  assert.equal(deleteAjsbsRes.success, true);
});
