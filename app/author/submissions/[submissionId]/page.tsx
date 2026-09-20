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

  const draft = submission.status === "DRAFT";

  const hasSubmissionReceived = (editorial?.events ?? []).some(
    (e) => e.type === "SUBMISSION_RECEIVED",
  );

  const timelineEvents = [
    {
      id: "draft_created",
      type: "Draft Created",
      message: null,
      createdAt: submission.createdAt,
    },
    ...(!hasSubmissionReceived && submission.submittedAt
      ? [
          {
            id: "submitted",
            type: "Submitted by Author",
            message: null,
            createdAt: submission.submittedAt,
          },
        ]
      : []),
    ...(editorial?.events ?? []).map((event) => {
      let eventType = event.type.replaceAll("_", " ").toLowerCase();
      let eventMessage = event.message;

      if (event.type === "SUBMISSION_RECEIVED") {
        eventType = "Submitted by Author";
      } else if (event.type === "TRACKING_ID_ASSIGNED") {
        eventType = "Tracking ID Assigned";
      } else if (event.type === "CORRECTION_REQUESTED") {
        eventType = "Correction Requested";
        if (event.message?.includes("attachment")) {
          const match = event.message.match(/\d+\s+attachments?/i);
          eventMessage = match ? match[0].toLowerCase() : event.message;
        } else {
          eventMessage = null;
        }
      } else if (event.type === "REVISION_SUBMITTED") {
        eventType = "Correction Submitted";
        if (event.message?.includes("attachment")) {
          const match = event.message.match(/\d+\s+attachments?/i);
          eventMessage = match ? match[0].toLowerCase() : event.message;
        } else {
          eventMessage = null;
        }
      } else if (event.type === "REVIEWER_ASSIGNED") {
        eventType = "Reviewer Assigned";
      } else if (event.type === "ADHERENCE_REPORT_SUBMITTED") {
        eventType = "Adherence Report Submitted";
        eventMessage = event.message ? `— ${event.message}` : null;
      } else if (event.type === "REVIEW_SUBMITTED") {
        eventType = "Final Review Submitted";
        eventMessage = event.message;
      } else if (event.type === "EDITORIAL_DECISION") {
        eventType = "Editorial Decision Issued";
      } else if (event.type === "INITIAL_ASSESSMENT_STARTED") {
        eventType = "Initial Assessment Started";
      } else if (event.type === "INITIAL_ASSESSMENT_PASSED") {
        eventType = "Initial Assessment Passed";
      }

      return {
        id: event.id,
        type: eventType,
        message: eventMessage,
        createdAt: event.createdAt,
      };
    }),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <Link
          href="/author"
          className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
        >
          ← Back to Author Workspace
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--color-border)] pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[color:var(--color-accent-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[color:var(--color-accent)] uppercase">
              {submission.journal.shortName ?? submission.journal.name}
            </span>
            <SubmissionStatus status={submission.status} />
          </div>
          <h1 className="mt-3 font-serif text-3xl font-medium tracking-[-0.035em] sm:text-4xl">
            {submission.title ?? "Untitled manuscript"}
          </h1>
          {submission.trackingNumber ? (
            <p className="mt-2 font-mono text-xs font-semibold text-[color:var(--color-accent)]">
              Tracking ID: {submission.trackingNumber}
            </p>
          ) : (
            <p className="mt-2 font-mono text-xs text-[color:var(--color-subtle)]">
              Tracking ID pending editorial assignment
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
      </div>

      <div className="mt-6 grid max-w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
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
              downloadUrl: `/api/author/submissions/${submission.id}/versions/${version.id}/manuscript`,
            }))}
          />

          {request ? (
            <details
              className="group rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5"
              open
            >
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-[color:var(--color-foreground)] select-none">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  <span>Conversation with editorial secretariat</span>
                </div>
                <span className="text-xs text-[color:var(--color-subtle)] transition-transform group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <div className="mt-4 border-t border-[color:var(--color-border)] pt-4">
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
            </details>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-4">
          {submission.status === "ACCEPTED" ? (
            <div className="rounded-[var(--radius-lg)] border border-emerald-500/40 bg-emerald-500/5 p-5">
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                ACCEPTED FOR PUBLICATION
              </span>
              <h2 className="mt-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                Manuscript Accepted
              </h2>
              <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted)]">
                Your manuscript has been accepted by the editorial team and is
                currently in production for Volume &amp; Issue scheduling. You
                will receive final publication details and DOI links once
                published.
              </p>
            </div>
          ) : null}

          {submission.status === "PUBLISHED" ? (
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

          <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5">
            <h2 className="text-sm font-semibold text-[color:var(--color-foreground)]">
              Timeline & Audit History
            </h2>
            <ol className="mt-4 border-l border-[color:var(--color-border-strong)] pl-5">
              {timelineEvents.map((event) => (
                <TimelineItem
                  key={event.id}
                  label={event.type}
                  date={event.createdAt}
                  message={event.message}
                />
              ))}
            </ol>
          </div>

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
