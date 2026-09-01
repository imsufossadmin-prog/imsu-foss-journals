import type { ReactNode } from "react";

import { setJournalOperationalStateAction } from "@/app/admin/journal-activation-actions";
import { DepartmentActivationScreen } from "@/components/admin/department-activation-screen";
import { AuthenticatedShell } from "@/components/app/authenticated-shell";
import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";
import {
  isJournalActivated,
  isProtectedBreakGlassUser,
} from "@/lib/editorial/journal-activation";

type JournalAdminLayoutProps = {
  children: ReactNode;
  params: Promise<{ journalSlug: string }>;
};

export default async function JournalAdminLayout({
  children,
  params,
}: JournalAdminLayoutProps) {
  const { journalSlug } = await params;
  const { user, journal, journalWorkspaces } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  const isActivated = await isJournalActivated(journalSlug);
  const isBreakGlass = isProtectedBreakGlassUser(user);
  const workspaces = getAvailableWorkspaces(user);
  const workspace = workspaces.find(
    (item) => item.area === "journal-admin" && item.journal?.id === journal.id,
  ) ?? {
    id: `journal-admin:${journal.id}`,
    href: `/admin/${journal.slug}`,
    area: "journal-admin" as const,
    roleLabel: "Journal Administrator",
    title: journal.name,
    description: "Journal operations workspace.",
    journal,
  };

  if (!isActivated) {
    return (
      <AuthenticatedShell
        user={user}
        workspace={workspace}
        workspaces={workspaces}
        journalWorkspaces={journalWorkspaces}
        navigation={[{ href: "/account", label: "Account" }]}
      >
        <DepartmentActivationScreen
          journal={journal}
          isBreakGlass={isBreakGlass}
          action={setJournalOperationalStateAction}
        />
      </AuthenticatedShell>
    );
  }

  return (
    <AuthenticatedShell
      user={user}
      workspace={workspace}
      workspaces={workspaces}
      journalWorkspaces={journalWorkspaces}
      navigation={[
        { href: `/admin/${journal.slug}`, label: "Submission requests" },
        {
          href: `/admin/${journal.slug}/submissions`,
          label: "Manuscripts",
          matchSubtree: true,
        },
        {
          href: "/admin/articles",
          label: "Articles & Content",
          matchSubtree: true,
        },
        {
          href: `/admin/${journal.slug}/chat`,
          label: "Team Chat",
          matchSubtree: true,
        },
        { href: `/admin/${journal.slug}/access`, label: "Users" },
        { href: "/account", label: "Account" },
      ]}
    >
      {children}
    </AuthenticatedShell>
  );
}
