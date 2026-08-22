import Link from "next/link";
import { notFound } from "next/navigation";

import {
  assignTrackingAction,
  confirmPaymentAction,
  sendAdminMessageAction,
} from "@/app/admin/[journalSlug]/requests/actions";
import {
  AdminStateAction,
  AttachmentUploader,
  ConversationThread,
  MessageComposer,
  RequestStatus,
  type ConversationMessageDTO,
} from "@/components/requests/request-components";
import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import { getDepartmentRequest } from "@/lib/requests/data";

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
  const request = await getDepartmentRequest(journal.department.id, requestId);
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
  const receipt = request.messages
    .flatMap((message) => message.attachments)
    .find((attachment) => attachment.type === "PAYMENT_RECEIPT");
  const manuscript = request.submission?.files.find(
    ({ type }) => type === "MANUSCRIPT",
  );
  const manuscriptVersion = request.submission?.manuscriptVersions[0];
  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 px-1 sm:px-0">
      <Link
        href={`/admin/${journal.slug}`}
        className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
      >
        ← Submission requests
      </Link>
      <header className="mt-4 border-b border-[color:var(--color-border)] pb-6">
        <RequestStatus status={request.status} />
        <h1 className="mt-3 font-serif text-2xl font-medium tracking-[-0.035em] break-words sm:text-4xl lg:text-5xl">
          {request.submission?.title ?? request.author.displayName}
        </h1>
        <p className="mt-2 text-xs text-[color:var(--color-muted)] sm:text-sm">
          Author: {request.author.displayName}
        </p>
        {request.submission?.trackingNumber ? (
          <p className="mt-2 font-mono text-xs font-semibold text-[color:var(--color-accent)] sm:text-sm">
            Tracking ID: {request.submission.trackingNumber}
          </p>
        ) : null}
      </header>
      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 sm:p-6">
          <h2 className="text-sm font-semibold">Conversation with author</h2>
          <div className="mt-6">
            <ConversationThread
              requestId={request.id}
              viewerId={user.id}
              messages={messages}
            />
          </div>
          <div className="mt-7">
            <MessageComposer
              action={sendAdminMessageAction.bind(
                null,
                journal.slug,
                request.id,
              )}
            />
          </div>
        </section>
        <aside className="space-y-4">
          <AttachmentUploader requestId={request.id} />
          {["NEW", "AWAITING_PAYMENT", "RECEIPT_SUBMITTED"].includes(
            request.status,
          ) ? (
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5">
              <h2 className="text-sm font-semibold">Submission Activation</h2>
              {receipt ? (
                <a
                  href={`/api/requests/${request.id}/attachments/${receipt.id}`}
                  className="mt-2 block text-xs font-semibold text-[color:var(--color-accent)]"
                >
                  View uploaded receipt →
                </a>
              ) : (
                <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                  Payment verified via WhatsApp or direct transfer? Click below
                  to enable submission for this author.
                </p>
              )}
              <div className="mt-4">
                <AdminStateAction
                  action={confirmPaymentAction.bind(
                    null,
                    journal.slug,
                    request.id,
                  )}
                  label="Activate Submission for Author"
                />
              </div>
            </div>
          ) : null}
          {request.status === "MANUSCRIPT_SUBMITTED" && request.submission ? (
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-accent)] p-5">
              <h2 className="text-sm font-semibold">Manuscript received</h2>
              {manuscript && manuscriptVersion ? (
                <a
                  href={`/api/admin/${journal.slug}/submissions/${request.submission.id}/versions/${manuscriptVersion.id}/manuscript`}
                  className="mt-3 block text-xs font-semibold text-[color:var(--color-accent)]"
                >
                  Open manuscript
                </a>
              ) : null}
              <div className="mt-5">
                <AdminStateAction
                  action={assignTrackingAction.bind(
                    null,
                    journal.slug,
                    request.id,
                  )}
                  label="Assign tracking ID"
                  field="trackingId"
                />
              </div>
            </div>
          ) : null}
          {request.submission ? (
            <Link
              href={`/admin/${journal.slug}/submissions/${request.submission.id}`}
              className="button-secondary inline-flex"
            >
              Open manuscript record
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
