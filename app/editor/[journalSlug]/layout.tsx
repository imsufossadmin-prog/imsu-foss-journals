import type { ReactNode } from "react";

import { AuthenticatedShell } from "@/components/app/authenticated-shell";
import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";

type JournalEditorLayoutProps = {
  children: ReactNode;
  params: Promise<{ journalSlug: string }>;
};

export default async function JournalEditorLayout({
  children,
  params,
}: JournalEditorLayoutProps) {
  const { journalSlug } = await params;
  const { user, journal, journalWorkspaces } = await requireJournalWorkspace(
    "EDITOR",
    journalSlug,
  );
  const workspaces = getAvailableWorkspaces(user);
  const workspace = workspaces.find(
    (item) => item.area === "editor" && item.journal?.id === journal.id,
  ) ?? {
    id: `editor:${journal.id}`,
    href: `/editor/${journal.slug}`,
    area: "editor" as const,
    roleLabel: "Editor",
    title: journal.name,
    description: "Editorial review workspace.",
    journal,
  };

  return (
    <AuthenticatedShell
      user={user}
      workspace={workspace}
      workspaces={workspaces}
      journalWorkspaces={journalWorkspaces}
      navigation={[
        { href: `/editor/${journal.slug}`, label: "Assignments" },
        {
          href: `/editor/${journal.slug}/chat`,
          label: "Team Chat",
          matchSubtree: true,
        },
        { href: "/account", label: "Account" },
      ]}
    >
      {children}
    </AuthenticatedShell>
  );
}
