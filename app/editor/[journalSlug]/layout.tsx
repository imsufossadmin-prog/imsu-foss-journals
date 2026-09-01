import type { ReactNode } from "react";

import { AuthenticatedShell } from "@/components/app/authenticated-shell";
import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";
import { isJournalActivated } from "@/lib/editorial/journal-activation";

function LockIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

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
  const isActivated = await isJournalActivated(journalSlug);
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

  if (!isActivated) {
    return (
      <AuthenticatedShell
        user={user}
        workspace={workspace}
        workspaces={workspaces}
        journalWorkspaces={journalWorkspaces}
        navigation={[{ href: "/account", label: "Account" }]}
      >
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-4 py-12">
          <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
                <LockIcon className="size-5" />
              </div>

              <div>
                <span className="rounded bg-[color:var(--color-accent-soft)] px-2 py-0.5 text-[11px] font-bold tracking-wide text-[color:var(--color-accent)] uppercase">
                  {journal.shortName ?? journal.name}
                </span>
                <h1 className="mt-1 font-serif text-2xl font-medium tracking-tight text-[color:var(--color-foreground)] sm:text-3xl">
                  {journal.name}
                </h1>
              </div>
            </div>
            <div className="mt-6 border-t border-[color:var(--color-border)]/70 pt-6">
              <p className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
                Department configuration required
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-muted)]">
                This department has not yet been configured for journal
                operations.
              </p>
              <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                Contact your Journal Administrator.
              </p>
            </div>
          </div>
        </div>
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
