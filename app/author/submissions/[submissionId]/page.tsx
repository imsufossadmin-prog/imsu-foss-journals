import Link from "next/link";
import { redirect } from "next/navigation";

import { sendAuthorMessageAction } from "@/app/author/requests/actions";
import { submitAuthorCorrectionAction } from "@/app/author/submissions/actions";
import { AuthorCorrectionTriggerButton } from "@/components/editorial/revision-upload-form";
import {
  RequestChatBox,
  type ConversationMessageDTO,
} from "@/components/requests/request-components";
import { SubmissionDetailsAccordion } from "@/components/submissions/submission-details-accordion";
import { SubmissionStatus } from "@/components/submissions/submission-status";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { getAuthorEditorialHistory } from "@/lib/editorial/data";
import { getAuthorRequest } from "@/lib/requests/data";
import { getAuthorSubmission } from "@/lib/submissions/data";

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const user = await requireApplicationArea("author");
  const { submissionId } = await params;
  const [submission, editorial] = await Promise.all([
    getAuthorSubmission(user.id, submissionId),
    getAuthorEditorialHistory(user.id, submissionId),
  ]);
  if (!submission) redirect("/unauthorized?reason=workspace");

  const request = submission.request
    ? await getAuthorRequest(user.id, submission.request.id)
    : null;

  const messages: ConversationMessageDTO[] = request
    ? request.messages.map((message) => ({
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
      }))
    : [];

  if (submission.status === "ACCEPTED") {
    const publishedUrl = `/articles/art-${submission.id.toLowerCase()}`;
    const hasCongrats = messages.some((m) =>
      m.body?.includes("officially published"),
    );
    if (!hasCongrats) {
      messages.push({
        id: "published-congrats-system",
        kind: "SYSTEM",
        body: `Congratulations! Your manuscript "${submission.title ?? "Untitled"}" has been officially published live in IMSU FOSS Journals. View article live: ${publishedUrl}`,
        createdAt: new Date().toISOString(),
        sender: null,
        attachments: [],
      });
    }
  }

  const draft = submission.status === "DRAFT";

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/author/submissions"
        className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
      >
        ← My Submissions
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--color-border)] pb-6">
        <div>
          <SubmissionStatus status={submission.status} />
          <h1 className="mt-3 font-serif text-3xl font-medium tracking-[-0.035em] sm:text-4xl">
            {submission.title ?? "Untitled manuscript"}
          </h1>
          {submission.trackingNumber ? (
            <p className="mt-2 font-mono text-xs text-[color:var(--color-subtle)]">
              {submission.trackingNumber}
            </p>
          ) : null}
        </div>
        {draft ? (
          <Link
            href={
              submission.request
                ? `/author/requests/${submission.request.id}/submit?submission=${submission.id}`
                : `/author/submissions/${submission.id}/edit/details`
            }
            className="button-primary shrink-0"
          >
            Continue editing
          </Link>
        ) : ["CORRECTION_REQUESTED", "REVISION_REQUESTED"].includes(
            submission.status,
          ) ? (
          <AuthorCorrectionTriggerButton
            submissionId={submission.id}
            className="shrink-0"
          />
        ) : null}
      </div>

      <div className="mt-6 grid max-w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="max-w-full min-w-0 space-y-6">
          <SubmissionDetailsAccordion
            abstract={submission.abstract}
            keywords={submission.keywords}
            authors={submission.authors.map((author) => ({
              id: author.id,
              position: author.position,
              fullName: author.fullName,
              email: author.email,
              affiliation: author.affiliation,
              isCorrespondingAuthor: author.isCorrespondingAuthor,
            }))}
            files={submission.files.map((file) => ({
              id: file.id,
              originalFileName: file.originalFileName,
              type: file.type,
              downloadUrl: `/api/author/submissions/${submission.id}/files/${file.id}`,
            }))}
            versions={editorial?.manuscriptVersions.map((version) => ({
              id: version.id,
              versionNumber: version.versionNumber,
              label: version.kind.toLowerCase(),
              createdAt: dateFormatter.format(version.submittedAt),
              originalFileName: version.manuscriptStoredFile.originalFileName,
            }))}
          />

          {request ? (
            <DetailSection title="Conversation with the journal">
              <div className="w-full max-w-full min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-3 sm:p-5">
                <RequestChatBox
                  requestId={request.id}
                  viewerId={user.id}
                  messages={messages}
                  action={sendAuthorMessageAction.bind(null, request.id)}
                  authorCorrectionAction={submitAuthorCorrectionAction.bind(
                    null,
                    submission.id,
                  )}
                />
              </div>
            </DetailSection>
          ) : null}
        </div>
        <aside className="min-w-0 space-y-4">
          {submission.status === "ACCEPTED" ? (
            <div className="rounded-[var(--radius-lg)] border border-emerald-500/40 bg-emerald-500/5 p-5">
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                PUBLISHED
              </span>
              <h2 className="mt-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                Publication Deliverables
              </h2>
              <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted)]">
                Your paper is officially published. You can download the final
                publication deliverables below:
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <a
                  href={`/api/articles/art-${submission.id.toLowerCase()}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="button-primary text-center text-xs"
                >
                  Download Published Article
                </a>
                <a
                  href={`/api/articles/art-${submission.id.toLowerCase()}/cover`}
                  target="_blank"
                  rel="noreferrer"
                  className="button-secondary text-center text-xs"
                >
                  Download Article Cover
                </a>
                <Link
                  href={`/articles/art-${submission.id.toLowerCase()}`}
                  className="mt-1 text-center text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
                >
                  View Public Article Page →
                </Link>
              </div>
            </div>
          ) : null}

          {["CORRECTION_REQUESTED", "REVISION_REQUESTED"].includes(
            submission.status,
          ) ? (
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-accent)] bg-[color:var(--color-surface-raised)] p-5">
              <h2 className="text-sm font-semibold">Correction Required</h2>
              <p className="mt-2 text-xs leading-5 text-[color:var(--color-muted)]">
                The editorial team has requested corrections. Upload your
                revised manuscript file to continue.
              </p>
              <div className="mt-4">
                <AuthorCorrectionTriggerButton
                  submissionId={submission.id}
                  className="w-full justify-center"
                />
              </div>
            </div>
          ) : null}
          <details className="group rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 sm:p-5">
            <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-[color:var(--color-foreground)] select-none">
              <span>Timeline & Audit History</span>
              <span className="text-[10px] text-[color:var(--color-subtle)] transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>
            <div className="mt-4 border-t border-[color:var(--color-border)] pt-4">
              <ol className="border-l border-[color:var(--color-border-strong)] pl-5">
                {[
                  {
                    id: "draft_created",
                    type: "Draft created",
                    message: null,
                    createdAt: submission.createdAt,
                  },
                  ...(submission.submittedAt
                    ? [
                        {
                          id: "submitted",
                          type: "Submitted",
                          message: null,
                          createdAt: submission.submittedAt,
                        },
                      ]
                    : []),
                  ...(editorial?.events ?? []).map((event) => {
                    let eventType = event.type
                      .replaceAll("_", " ")
                      .toLowerCase();
                    let eventMessage = event.message;

                    if (event.type === "CORRECTION_REQUESTED") {
                      eventType = "Correction Requested";
                      if (event.message?.includes("attachment")) {
                        const match =
                          event.message.match(/\d+\s+attachments?/i);
                        eventMessage = match
                          ? match[0].toLowerCase()
                          : event.message;
                      } else {
                        eventMessage = null;
                      }
                    } else if (event.type === "REVISION_SUBMITTED") {
                      eventType = "Correction Submitted";
                      if (event.message?.includes("attachment")) {
                        const match =
                          event.message.match(/\d+\s+attachments?/i);
                        eventMessage = match
                          ? match[0].toLowerCase()
                          : event.message;
                      } else {
                        eventMessage = null;
                      }
                    }

                    return {
                      id: event.id,
                      type: eventType,
                      message: eventMessage,
                      createdAt: event.createdAt,
                    };
                  }),
                ]
                  .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
                  .map((event) => (
                    <TimelineItem
                      key={event.id}
                      label={event.type}
                      date={event.createdAt}
                      message={event.message}
                    />
                  ))}
              </ol>
            </div>
          </details>
          {draft ? (
            <Link
              href={`/author/submissions/${submission.id}/delete`}
              className="mt-6 inline-block text-xs font-semibold text-[color:var(--color-danger)] hover:underline"
            >
              Delete draft
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-full min-w-0 overflow-hidden">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function TimelineItem({
  label,
  date,
  message,
}: {
  label: string;
  date: Date;
  message?: string | null;
}) {
  return (
    <li className="relative pb-5 last:pb-0">
      <span className="absolute top-1.5 -left-[1.42rem] size-2 rounded-full bg-[color:var(--color-accent)]" />
      <p className="text-xs font-semibold capitalize">{label}</p>
      <p className="mt-1 text-[11px] text-[color:var(--color-subtle)]">
        {dateFormatter.format(date)}
      </p>
      {message ? (
        <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted)]">
          {message}
        </p>
      ) : null}
    </li>
  );
}
