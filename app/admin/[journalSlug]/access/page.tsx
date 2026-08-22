import {
  JournalEditorManager,
  RoleManagementNotice,
  UserSearch,
} from "@/components/admin/role-management";
import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import { searchRoleManagementUsers } from "@/lib/auth/role-management-session";

import { assignEditorAction, removeEditorAction } from "./actions";

export default async function JournalAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ journalSlug: string }>;
  searchParams: Promise<{ q?: string; notice?: string; error?: string }>;
}) {
  const { journalSlug } = await params;
  const { q = "", notice, error } = await searchParams;
  const { journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  const users = await searchRoleManagementUsers(q);
  const assign = assignEditorAction.bind(null, journal.id, journal.slug);
  const remove = removeEditorAction.bind(null, journal.id, journal.slug);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
          {journal.department.name} access
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
          Choose Editors.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[color:var(--color-muted)]">
          Ask an Editor to sign in with Google once, then search for the email
          they used.
        </p>
        <UserSearch query={q} />
        <RoleManagementNotice notice={notice} error={error} />
      </header>
      <JournalEditorManager
        query={q}
        users={users}
        journalId={journal.id}
        assignAction={assign}
        removeAction={remove}
      />
    </div>
  );
}
