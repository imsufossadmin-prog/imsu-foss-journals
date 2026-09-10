import { redirect } from "next/navigation";

import { AuthenticatedShell } from "@/components/app/authenticated-shell";
import { EditorialBoardManager } from "@/components/admin/editorial-board-manager";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";
import { isSuperAdmin } from "@/lib/auth/permissions";
import {
  CANONICAL_JOURNAL_METADATA,
  type EditorialBoardMember,
} from "@/lib/editorial/editorial-board-data";
import {
  getJournalEditorialBoard,
  getJournalMetadataWithOverrides,
  isAuthorizedForJournal,
} from "@/lib/editorial/editorial-board-store";

export const dynamic = "force-dynamic";

export default async function AdminEditorialBoardPage() {
  const user = await requireApplicationArea("admin");
  const workspaces = getAvailableWorkspaces(user);
  const workspace =
    workspaces.find((item) => item.area === "platform") ?? workspaces[0];

  if (!workspace) {
    redirect("/unauthorized?reason=workspace");
  }

  // Filter journals based on administrator scope (Super Admin gets all 4; Journal Admin gets assigned journals)
  const allCanonical = Object.values(CANONICAL_JOURNAL_METADATA);
  const accessibleJournals = isSuperAdmin(user)
    ? allCanonical
    : allCanonical.filter((j) => isAuthorizedForJournal(user, j.slug));

  if (accessibleJournals.length === 0) {
    redirect("/unauthorized?reason=scope");
  }

  // Load journal metadata with overrides and initial editorial boards for accessible canonical journals
  const [journals, boardPairs] = await Promise.all([
    Promise.all(
      accessibleJournals.map(async (j) => {
        const meta = await getJournalMetadataWithOverrides(j.slug);
        return meta ?? j;
      }),
    ),
    Promise.all(
      accessibleJournals.map(async (j) => {
        const board = await getJournalEditorialBoard(j.slug);
        return [j.slug, board] as [string, EditorialBoardMember[]];
      }),
    ),
  ]);

  const initialBoards = Object.fromEntries(boardPairs);

  return (
    <AuthenticatedShell
      user={user}
      workspace={workspace}
      workspaces={workspaces}
      navigation={[
        { href: "/admin", label: "Overview" },
        { href: "/admin/requests", label: "Requests" },
        { href: "/admin/submissions", label: "Manuscripts" },
        { href: "/admin/articles", label: "Articles & Content" },
        { href: "/admin/editorial-board", label: "Editorial Board" },
        { href: "/admin/reviewers", label: "Reviewers" },
        { href: "/admin/announcements", label: "Announcements" },
        { href: "/admin/access", label: "Users" },
      ]}
    >
      <EditorialBoardManager
        journals={journals}
        initialBoards={initialBoards}
      />
    </AuthenticatedShell>
  );
}
