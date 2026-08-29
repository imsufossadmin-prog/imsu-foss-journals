import Link from "next/link";
import { notFound } from "next/navigation";

import {
  beginSubmissionAction,
  sendAuthorMessageAction,
} from "@/app/author/requests/actions";
import { submitAuthorCorrectionAction } from "@/app/author/submissions/actions";
import { AuthorCorrectionTriggerButton } from "@/components/editorial/revision-upload-form";
import { PendingButton } from "@/components/submissions/pending-button";
import {
  RequestChatBox,
  RequestStatus,
  type ConversationMessageDTO,
} from "@/components/requests/request-components";
import { requireGlobalRole } from "@/lib/auth/authorization";
import { getAuthorRequest } from "@/lib/requests/data";

export default async function AuthorRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const user = await requireGlobalRole("AUTHOR");
  const { requestId } = await params;
  const request = await getAuthorRequest(user.id, requestId);
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
      <Link
        href="/author"
        className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
      >
        ← Submission requests
      </Link>
      <header className="mt-4 border-b border-[color:var(--color-border)] pb-6">
        <RequestStatus status={request.status} guidance />
        <h1 className="mt-3 font-serif text-2xl font-medium tracking-[-0.035em] break-words sm:text-4xl lg:text-5xl">
          {request.submission?.title ?? "Psychology submission request"}
        </h1>
        {request.submission?.trackingNumber ? (
          <p className="mt-3 font-mono text-xs font-semibold text-[color:var(--color-accent)] sm:text-sm">
            Tracking ID: {request.submission.trackingNumber}
          </p>
        ) : null}
      </header>
      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 sm:p-6">
          <h2 className="text-sm font-semibold">
            Conversation with the journal
          </h2>
          <div className="mt-6">
            <RequestChatBox
              requestId={request.id}
              viewerId={user.id}
              messages={messages}
              action={sendAuthorMessageAction.bind(null, request.id)}
              authorCorrectionAction={
                request.submission
                  ? submitAuthorCorrectionAction.bind(
                      null,
                      request.submission.id,
                    )
                  : undefined
              }
            />
          </div>
        </section>
        <aside className="space-y-4">
          {!request.submission ||
          request.submission.status === "DRAFT" ||
          request.status === "NEW" ||
          request.status === "SUBMISSION_ENABLED" ? (
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-accent)] bg-[color:var(--color-surface-raised)] p-5">
              <h2 className="text-sm font-semibold">Ready to submit</h2>
              <p className="mt-2 text-xs leading-5 text-[color:var(--color-muted)]">
                Complete the short article form and upload your Microsoft Word
                manuscript (.doc or .docx).
              </p>
              <form
                action={beginSubmissionAction.bind(null, request.id)}
                className="mt-4"
              >
                <PendingButton
                  className="button-primary w-full"
                  pendingLabel="Preparing form…"
                >
                  Submit article
                </PendingButton>
              </form>
            </div>
          ) : null}
          {request.submission && request.submission.status !== "DRAFT" ? (
            <div className="space-y-3 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5">
              <h2 className="text-sm font-semibold">Manuscript Status</h2>
              <p className="text-xs text-[color:var(--color-muted)]">
                Status: {request.submission.status.replaceAll("_", " ")}
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href={`/author/submissions/${request.submission.id}`}
                  className="button-secondary inline-flex items-center justify-center text-center text-xs"
                >
                  View manuscript record
                </Link>
                {["CORRECTION_REQUESTED", "REVISION_REQUESTED"].includes(
                  request.submission.status,
                ) ? (
                  <AuthorCorrectionTriggerButton
                    submissionId={request.submission.id}
                    className="w-full justify-center"
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
