import Link from "next/link";
import { notFound } from "next/navigation";

import { sendAdminMessageAction } from "@/app/admin/[journalSlug]/requests/actions";
import {
  RequestChatBox,
  RequestStatus,
  type ConversationMessageDTO,
} from "@/components/requests/request-components";
import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import { getJournalRequest } from "@/lib/requests/data";

export default async function AdminRequestPage({
  params,
}: {
  params: Promise<{ journalSlug: string; requestId: string }>;
}) {
  const { journalSlug, requestId } = await params;
  const { user, journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  const request = await getJournalRequest(journal.id, requestId);
  if (!request) notFound();
  const messages: ConversationMessageDTO[] = request.messages.map(
    (message) => ({
      id: message.id,
      kind: message.kind,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
      attachments: message.attachments.map((attachment) => ({
        id: attachment.id,
        type: attachment.type,
        originalFileName: attachment.storedFile.originalFileName,
        sizeBytes: Number(attachment.storedFile.sizeBytes),
      })),
    }),
  );

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 px-1 sm:px-0">
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/${journal.slug}`}
          prefetch={true}
          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-foreground)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
        >
          ← Back to Requests
        </Link>
        <Link
          href={`/admin/${journal.slug}/submissions`}
          prefetch={true}
          className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
        >
          Manuscripts list
        </Link>
      </div>
      <header className="mt-4 border-b border-[color:var(--color-border)] pb-6">
        <RequestStatus status={request.status} />
        <h1 className="mt-3 font-serif text-2xl font-medium tracking-[-0.035em] break-words sm:text-4xl lg:text-5xl">
          {request.submission?.title ?? request.author.displayName}
        </h1>
        <p className="mt-2 text-xs text-[color:var(--color-muted)] sm:text-sm">
          Author: {request.author.displayName}
        </p>
        {request.submission?.trackingNumber ? (
          <p className="mt-2 font-mono text-xs font-semibold text-[color:var(--color-accent)]">
            Tracking ID: {request.submission.trackingNumber}
          </p>
        ) : null}
      </header>
      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 sm:p-6">
          <h2 className="text-sm font-semibold">Conversation with author</h2>
          <div className="mt-6">
            <RequestChatBox
              requestId={request.id}
              viewerId={user.id}
              messages={messages}
              action={sendAdminMessageAction.bind(
                null,
                journal.slug,
                request.id,
              )}
            />
          </div>
        </section>
        <aside className="space-y-4">
          {request.submission ? (
            <Link
              href={`/admin/${journal.slug}/submissions/${request.submission.id}`}
              prefetch={true}
              className="button-secondary inline-flex w-full items-center justify-center gap-2 text-xs font-semibold"
            >
              Open manuscript record →
            </Link>
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5">
              <h2 className="text-sm font-semibold">Manuscript Intake</h2>
              <p className="mt-2 text-xs leading-5 text-[color:var(--color-muted)]">
                The author has an active submission request and can submit their
                manuscript form at any time.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
