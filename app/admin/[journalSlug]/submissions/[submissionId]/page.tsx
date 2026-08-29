import Link from "next/link";
import { notFound } from "next/navigation";

import { sendAdminMessageAction } from "@/app/admin/[journalSlug]/requests/actions";
import { correctionAction } from "@/app/admin/[journalSlug]/submissions/actions";
import {
  AssessmentAction,
  AssignmentForm,
  AssignTrackingIdForm,
  CancelAssignmentForm,
  CorrectionForm,
  DecisionForm,
  PublishArticleForm,
  RevisionReceivedForm,
  SkipToPublishingForm,
} from "@/components/editorial/admin-forms";
import { CopyReportButton } from "@/components/editorial/review-report-actions";
import {
  RequestChatBox,
  type ConversationMessageDTO,
} from "@/components/requests/request-components";
import { SubmissionDetailsAccordion } from "@/components/submissions/submission-details-accordion";
import { SubmissionStatus } from "@/components/submissions/submission-status";
import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import {
  getEditorialSubmission,
  listAssignableEditors,
} from "@/lib/editorial/data";

const date = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function EditorialSubmissionPage({
  params,
}: {
  params: Promise<{ journalSlug: string; submissionId: string }>;
}) {
  const { journalSlug, submissionId } = await params;
  const { user, journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  const [submission, editors] = await Promise.all([
    getEditorialSubmission(journal.id, submissionId),
    listAssignableEditors(journal.id),
  ]);
  if (!submission) notFound();
  const currentRound = submission.reviewRounds[0];
  const submittedReviews =
    currentRound?.assignments.filter(
      ({ review }) => review?.status === "SUBMITTED",
    ) ?? [];

  const messages: ConversationMessageDTO[] = submission.request
    ? submission.request.messages.map((message) => ({
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

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-foreground)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
        >
          ← Back to Overview
        </Link>
        <Link
          href={`/admin/${journal.slug}/submissions`}
          className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
        >
          Manuscripts list
        </Link>
      </div>
      <header className="mt-6 pb-6">
        <SubmissionStatus status={submission.status} />
        <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-tight font-medium tracking-[-0.035em] sm:text-5xl">
          {submission.title ?? "Untitled manuscript"}
        </h1>
        <p className="mt-2 font-mono text-xs text-[color:var(--color-subtle)]">
          {submission.trackingNumber ?? "Tracking pending"}
        </p>
      </header>

      <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="space-y-6">
          <SubmissionDetailsAccordion
            abstract={submission.abstract}
            keywords={submission.keywords}
            submittingAccount={{
              displayName: submission.owner.displayName,
              institution: submission.owner.institution,
            }}
            authors={submission.authors.map((author) => ({
              id: author.id,
              position: author.position,
              fullName: author.fullName,
              email: author.email,
              affiliation: author.affiliation,
              orcid: author.orcid,
              isCorrespondingAuthor: author.isCorrespondingAuthor,
            }))}
            files={submission.files.map((file) => ({
              id: file.id,
              originalFileName: file.storedFile.originalFileName,
              type: file.type,
              downloadUrl: `/api/author/submissions/${submission.id}/files/${file.id}`,
            }))}
            versions={submission.manuscriptVersions.map((version) => ({
              id: version.id,
              versionNumber: version.versionNumber,
              label: version.kind.toLowerCase(),
              createdAt: date.format(version.submittedAt),
              originalFileName: version.manuscriptStoredFile.originalFileName,
            }))}
          />

          {submission.request ? (
            <div className="rounded-[var(--radius-lg)] bg-[color:var(--color-surface-raised)] p-5">
              <h2 className="mb-4 text-sm font-semibold text-[color:var(--color-foreground)]">
                Conversation with author
              </h2>
              <RequestChatBox
                requestId={submission.request.id}
                viewerId={user.id}
                messages={messages}
                action={sendAdminMessageAction.bind(
                  null,
                  journal.slug,
                  submission.request.id,
                )}
                correctionAction={correctionAction.bind(
                  null,
                  journal.slug,
                  submission.id,
                )}
              />
            </div>
          ) : null}

          {currentRound ? (
            <Section title={`Review round ${currentRound.roundNumber}`}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--color-muted)]">
                <span>
                  {currentRound.status.toLowerCase()} · manuscript version{" "}
                  {currentRound.submissionVersion.versionNumber}
                </span>
                <span>
                  {submittedReviews.length} submitted review
                  {submittedReviews.length === 1 ? "" : "s"}
                </span>
              </div>
              {currentRound.status !== "COMPLETED" &&
              ["AWAITING_REVIEWERS", "UNDER_REVIEW"].includes(
                submission.status,
              ) ? (
                <details className="group mb-6 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
                  <summary className="flex cursor-pointer items-center justify-between p-4 text-xs font-semibold text-[color:var(--color-foreground)] select-none">
                    <span>Assign system reviewer (optional)</span>
                    <span className="text-[10px] text-[color:var(--color-subtle)] transition-transform group-open:rotate-180">
                      ▼
                    </span>
                  </summary>
                  <div className="border-t border-[color:var(--color-border)] p-4">
                    <AssignmentForm
                      journalSlug={journal.slug}
                      submissionId={submission.id}
                      editors={editors}
                    />
                    {editors.length < 2 ? (
                      <p className="mt-3 text-xs text-[color:var(--color-danger)]">
                        At least two active editors in this journal are required
                        to assign online reviewers.
                      </p>
                    ) : null}
                  </div>
                </details>
              ) : null}
              <div className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
                {currentRound.assignments.map((assignment, index) => (
                  <div
                    key={assignment.id}
                    className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        Reviewer {index + 1}: {assignment.editor.displayName}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                        {assignment.status.toLowerCase().replaceAll("_", " ")}
                        {assignment.dueAt
                          ? ` · due ${date.format(assignment.dueAt)}`
                          : ""}
                      </p>
                    </div>
                    {!assignment.completedAt &&
                    !["CANCELLED", "DECLINED"].includes(assignment.status) ? (
                      <CancelAssignmentForm
                        journalSlug={journal.slug}
                        submissionId={submission.id}
                        assignmentId={assignment.id}
                      />
                    ) : null}
                    {assignment.review?.status === "SUBMITTED" ? (
                      <details
                        className="group rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] sm:col-span-2"
                        open
                      >
                        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 text-xs font-semibold text-[color:var(--color-foreground)] select-none">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-semibold text-[color:var(--color-accent)]">
                              Final Review Submitted
                            </span>
                            <span className="rounded-full border border-[color:var(--color-accent)]/50 bg-[color:var(--color-surface-raised)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--color-foreground)]">
                              Recommendation:{" "}
                              <span className="font-semibold text-[color:var(--color-accent)]">
                                {assignment.review.recommendation
                                  ?.replaceAll("_", " ")
                                  .toLowerCase()
                                  .replace(/\b\w/g, (c) => c.toUpperCase()) ??
                                  "—"}
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] text-[color:var(--color-subtle)] transition-transform group-open:rotate-180">
                              ▼
                            </span>
                          </div>
                        </summary>

                        <div className="space-y-4 border-t border-[color:var(--color-border)] p-4">
                          {/* 1-10 Scorecard details */}
                          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                            {[
                              {
                                label: "Title & Abstract",
                                val: assignment.review.titleAbstract,
                              },
                              {
                                label: "Intro & Thesis",
                                val: assignment.review.introductionThesis,
                              },
                              {
                                label: "Literature Review",
                                val: assignment.review.literatureReview,
                              },
                              {
                                label: "Methodology",
                                val: assignment.review.methodology,
                              },
                              {
                                label: "Results & Discussion",
                                val: assignment.review.resultsDiscussion,
                              },
                              {
                                label: "Conclusion",
                                val: assignment.review.conclusion,
                              },
                              {
                                label: "Language & Style",
                                val: assignment.review.languageStyle,
                              },
                              {
                                label: "APA 7th Adherence",
                                val: assignment.review.apaAdherence,
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="rounded bg-[color:var(--color-surface-raised)] p-2"
                              >
                                <p className="text-[10px] text-[color:var(--color-subtle)]">
                                  {item.label}
                                </p>
                                <p className="font-mono text-xs font-bold text-[color:var(--color-accent)]">
                                  {item.val ? `${item.val} / 10` : "—"}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-[color:var(--color-foreground)]">
                                General Review Report:
                              </p>
                              {(assignment.review.generalReport ??
                              assignment.review.commentsToAuthor) ? (
                                <CopyReportButton
                                  reportText={
                                    assignment.review.generalReport ??
                                    assignment.review.commentsToAuthor ??
                                    ""
                                  }
                                />
                              ) : null}
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed whitespace-pre-wrap text-[color:var(--color-muted)]">
                              {assignment.review.generalReport ??
                                assignment.review.commentsToAuthor ??
                                "No written general report provided."}
                            </p>
                          </div>

                          {assignment.review.attachments &&
                          assignment.review.attachments.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold text-[color:var(--color-foreground)]">
                                Review Attachments:
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {assignment.review.attachments.map((att) => (
                                  <a
                                    key={att.id}
                                    href={`/api/editor/${journal.slug}/assignments/${assignment.id}/attachments/${att.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-3 py-1 text-xs text-[color:var(--color-accent)] hover:underline"
                                  >
                                    <span>📎</span>
                                    <span>
                                      {att.storedFile.originalFileName}
                                    </span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {assignment.review.confidentialComments ? (
                            <div className="border-t border-[color:var(--color-border)] pt-3">
                              <p className="text-xs font-semibold text-[color:var(--color-foreground)]">
                                Confidential Comments:
                              </p>
                              <p className="mt-1 text-xs leading-relaxed whitespace-pre-wrap text-[color:var(--color-muted)]">
                                {assignment.review.confidentialComments}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Adherence Reports Section */}
          {submission.adherenceReports &&
          submission.adherenceReports.length > 0 ? (
            <Section title="Author Revision Adherence Reports">
              <div className="space-y-3">
                {submission.adherenceReports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--color-border)] pb-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          report.outcome === "ADHERED"
                            ? "bg-[color:var(--color-accent)]/15 text-[color:var(--color-accent)]"
                            : report.outcome === "PARTIALLY_ADHERED"
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-[color:var(--color-danger)]/15 text-[color:var(--color-danger)]"
                        }`}
                      >
                        {report.outcome === "ADHERED"
                          ? "Adhered"
                          : report.outcome === "PARTIALLY_ADHERED"
                            ? "Partially Adhered"
                            : "Did Not Adhere"}
                      </span>
                      <span className="text-xs text-[color:var(--color-subtle)]">
                        {date.format(report.createdAt)} ·{" "}
                        {report.editor.displayName}
                        {report.submissionVersion
                          ? ` (Revision v${report.submissionVersion.versionNumber})`
                          : ""}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed whitespace-pre-wrap text-[color:var(--color-foreground)]">
                      {report.report}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {submission.status === "ACCEPTED" ||
          (submission.status === "REVIEWS_RECEIVED" &&
            submittedReviews.some(
              ({ review }) => review?.recommendation === "ACCEPT",
            )) ? (
            <Section title="Publishing & Production">
              <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-accent)] bg-[color:var(--color-surface-raised)] p-5 sm:p-6">
                <h3 className="text-sm font-semibold">Publish Article</h3>
                <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted)]">
                  Upload the final formatted article and publication details.
                </p>
                <div className="mt-5">
                  <PublishArticleForm
                    journalSlug={journal.slug}
                    submissionId={submission.id}
                  />
                </div>
              </div>
            </Section>
          ) : null}

          {submission.reviewRounds.length > 1 ? (
            <Section title="Earlier review rounds">
              <ol className="space-y-3">
                {submission.reviewRounds.slice(1).map((round) => (
                  <li
                    key={round.id}
                    className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] p-4 text-sm"
                  >
                    <p className="font-semibold">
                      Round {round.roundNumber} · {round.status.toLowerCase()}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                      {
                        round.assignments.filter(
                          ({ review }) => review?.status === "SUBMITTED",
                        ).length
                      }{" "}
                      preserved reviews · manuscript version{" "}
                      {round.submissionVersion.versionNumber}
                    </p>
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}
        </main>

        <aside className="space-y-6">
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5">
            <h2 className="text-sm font-semibold">Next action</h2>
            <div className="mt-4">
              {["SUBMITTED", "REVISED"].includes(submission.status) &&
              submission.trackingNumber ? (
                <AssessmentAction
                  journalSlug={journal.slug}
                  submissionId={submission.id}
                  kind="begin"
                />
              ) : null}
              {["SUBMITTED", "REVISED"].includes(submission.status) &&
              !submission.trackingNumber ? (
                <AssignTrackingIdForm
                  journalSlug={journal.slug}
                  submissionId={submission.id}
                />
              ) : null}
              {submission.status === "SCREENING" ? (
                <div className="space-y-6">
                  <AssessmentAction
                    journalSlug={journal.slug}
                    submissionId={submission.id}
                    kind="pass"
                  />
                  <div className="border-t border-[color:var(--color-border)] pt-5">
                    <CorrectionForm
                      journalSlug={journal.slug}
                      submissionId={submission.id}
                    />
                  </div>
                </div>
              ) : null}
              {["CORRECTION_REQUESTED", "REVISION_REQUESTED"].includes(
                submission.status,
              ) ? (
                <div className="space-y-3">
                  <p className="text-xs leading-5 text-[color:var(--color-muted)]">
                    Waiting for author revision in chatbox. When revision is
                    ready, click below:
                  </p>
                  <RevisionReceivedForm
                    journalSlug={journal.slug}
                    submissionId={submission.id}
                  />
                </div>
              ) : null}
              {[
                "AWAITING_REVIEWERS",
                "UNDER_REVIEW",
                "REVIEWS_RECEIVED",
              ].includes(submission.status) &&
              currentRound &&
              !currentRound.decisions.length ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs leading-5 font-semibold text-[color:var(--color-foreground)]">
                      Publishing & Production
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-[color:var(--color-muted)]">
                      Skip formal decision steps and proceed directly to
                      publishing at any time.
                    </p>
                    <div className="mt-3">
                      <SkipToPublishingForm
                        journalSlug={journal.slug}
                        submissionId={submission.id}
                      />
                    </div>
                  </div>
                  <div className="border-t border-[color:var(--color-border)] pt-3">
                    <details className="group rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
                      <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-[color:var(--color-subtle)] select-none">
                        <span>Record Editorial Decision (Optional)</span>
                        <span className="text-[10px] text-[color:var(--color-subtle)] transition-transform group-open:rotate-180">
                          ▼
                        </span>
                      </summary>
                      <div className="mt-3 border-t border-[color:var(--color-border)] pt-3">
                        <DecisionForm
                          journalSlug={journal.slug}
                          submissionId={submission.id}
                          roundId={currentRound.id}
                        />
                      </div>
                    </details>
                  </div>
                </div>
              ) : null}
              {["ACCEPTED", "REJECTED"].includes(submission.status) ? (
                <p className="text-xs leading-5 text-[color:var(--color-muted)]">
                  This editorial workflow is complete. Publishing is outside
                  Phase 4.
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Audit trail</h2>
            <ol className="mt-4 border-l border-[color:var(--color-border-strong)] pl-5">
              {[
                {
                  id: "draft_created",
                  type: "Draft created",
                  message: null,
                  createdAt: submission.createdAt,
                  actorName: null,
                },
                ...(submission.submittedAt
                  ? [
                      {
                        id: "submitted",
                        type: "Submitted",
                        message: null,
                        createdAt: submission.submittedAt,
                        actorName: submission.owner.displayName,
                      },
                    ]
                  : []),
                ...submission.events.map((event) => {
                  let eventType = event.type.replaceAll("_", " ").toLowerCase();
                  let eventMessage = event.message;

                  if (event.type === "CORRECTION_REQUESTED") {
                    eventType = "Correction Requested";
                    if (event.message?.includes("attachment")) {
                      const match = event.message.match(/\d+\s+attachments?/i);
                      eventMessage = match
                        ? match[0].toLowerCase()
                        : event.message;
                    } else {
                      eventMessage = null;
                    }
                  } else if (event.type === "REVISION_SUBMITTED") {
                    eventType = "Correction Submitted";
                    if (event.message?.includes("attachment")) {
                      const match = event.message.match(/\d+\s+attachments?/i);
                      eventMessage = match
                        ? match[0].toLowerCase()
                        : event.message;
                    } else {
                      eventMessage = null;
                    }
                  } else if (event.type === "ADHERENCE_REPORT_SUBMITTED") {
                    eventType = "Adherence Report Submitted";
                    eventMessage = event.message ? `— ${event.message}` : null;
                  } else if (event.type === "REVIEW_SUBMITTED") {
                    eventType = "Final Review Submitted";
                    eventMessage = event.message;
                  }

                  return {
                    id: event.id,
                    type: eventType,
                    message: eventMessage,
                    createdAt: event.createdAt,
                    actorName: event.actor?.displayName,
                  };
                }),
              ]
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
                .map((event) => (
                  <li key={event.id} className="relative pb-5 last:pb-0">
                    <span className="absolute top-1.5 -left-[1.42rem] size-2 rounded-full bg-[color:var(--color-accent)]" />
                    <p className="text-xs font-semibold capitalize">
                      {event.type}
                    </p>
                    <p className="mt-1 text-[11px] text-[color:var(--color-subtle)]">
                      {date.format(event.createdAt)}
                      {event.actorName ? ` · ${event.actorName}` : ""}
                    </p>
                    {event.message ? (
                      <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted)]">
                        {event.message}
                      </p>
                    ) : null}
                  </li>
                ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
