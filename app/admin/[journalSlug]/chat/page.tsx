import Link from "next/link";
import { notFound } from "next/navigation";

import { InternalChatBox } from "@/components/internal-chat/internal-chatbox";
import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import { listInternalChatMessages } from "@/lib/editorial/internal-chat";

export default async function AdminInternalChatPage({
  params,
}: {
  params: Promise<{ journalSlug: string }>;
}) {
  const { journalSlug } = await params;
  const { user, journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );

  if (!journal) notFound();

  const messages = await listInternalChatMessages(journal.id);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Link
          href={`/admin/${journal.slug}`}
          className="text-xs font-semibold text-[color:var(--color-subtle)] hover:text-[color:var(--color-foreground)]"
        >
          ← Back to Editorial Operations
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-medium tracking-tight text-[color:var(--color-foreground)] sm:text-3xl">
              Internal Team Chat
            </h1>
            <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
              Direct, confidential communication channel between Journal
              Administrators and Departmental Editors for {journal.name}.
            </p>
          </div>
          <span className="rounded-full border border-[color:var(--color-accent)]/30 bg-[color:var(--color-surface)] px-3 py-1 text-xs font-semibold text-[color:var(--color-accent)]">
            🔒 Private Staff Channel
          </span>
        </div>
      </div>

      <InternalChatBox
        journalSlug={journal.slug}
        viewerId={user.id}
        initialMessages={messages}
      />
    </div>
  );
}
