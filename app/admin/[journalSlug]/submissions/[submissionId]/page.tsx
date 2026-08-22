import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AssessmentAction,
  AssignmentForm,
  CancelAssignmentForm,
  CorrectionForm,
  DecisionForm,
} from "@/components/editorial/admin-forms";
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

function score(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  if (!present.length) return "—";
  return (
    present.reduce((sum, value) => sum + value, 0) / present.length
  ).toFixed(1);
}

export default async function EditorialSubmissionPage({
  params,
}: {
  params: Promise<{ journalSlug: string; submissionId: string }>;
}) {
  const { journalSlug, submissionId } = await params;
  const { journal } = await requireJournalWorkspace(
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

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/admin/${journal.slug}/submissions`}
        className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
      >
        ← Manuscripts
      </Link>
      <header className="mt-8 border-b border-[color:var(--color-border)] pb-8">
        <SubmissionStatus status={submission.status} />
        <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-tight font-medium tracking-[-0.035em] sm:text-5xl">
          {submission.title ?? "Untitled manuscript"}
        </h1>
        <p className="mt-3 font-mono text-xs text-[color:var(--color-subtle)]">
          {submission.trackingNumber ?? "Tracking pending"}
        </p>
      </header>

      <div className="mt-9 grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="space-y-10">
          <Section title="Manuscript">
            <p className="text-sm leading-7 text-[color:var(--color-muted)]">
              {submission.abstract ?? "No abstract provided."}
            </p>
            <p className="mt-4 text-xs text-[color:var(--color-subtle)]">
              {submission.keywords.join(" · ") || "No keywords provided"}
            </p>
          </Section>

          <Section title="Author record">
            <div className="rounded-[var(--radius-md)] bg-[color:var(--color-surface)] p-4 text-sm">
              <p className="font-semibold">
                Submitting account: {submission.owner.displayName}
              </p>
              {submission.owner.institution ? (
                <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                  {submission.owner.institution}
                </p>
              ) : null}
            </div>
            <ol className="mt-4 divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
              {submission.authors.map((author) => (
                <li key={author.id} className="py-4 text-sm">
                  <p className="font-semibold">
                    {author.position}. {author.fullName}
                    {author.isCorrespondingAuthor ? " · Corresponding" : ""}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                    {[author.affiliation, author.email, author.orcid]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Files and preserved versions">
            <div className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
              {submission.files.map((file) => (
                <a
                  key={file.id}
                  href={`/api/author/submissions/${submission.id}/files/${file.id}`}
                  className="flex min-h-14 items-center justify-between gap-4 py-3 text-sm font-semibold hover:text-[color:var(--color-accent)]"
                >
                  <span className="truncate">
                    {file.storedFile.originalFileName}
                  </span>
                  <span className="text-[10px] text-[color:var(--color-subtle)]">
                    {file.type.replaceAll("_", " ")} · Download
                  </span>
                </a>
              ))}
              {submission.manuscriptVersions.map((version) => (
                <div key={version.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        Version {version.versionNumber} ·{" "}
                        {version.kind.toLowerCase()}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                        {date.format(version.submittedAt)} ·{" "}
                        {version.manuscriptStoredFile.originalFileName}
                      </p>
                    </div>
                    <div className="flex gap-3 text-xs font-semibold">
                      <a
                        href={`/api/admin/${journal.slug}/submissions/${submission.id}/versions/${version.id}/manuscript`}
                        className="hover:text-[color:var(--color-accent)]"
                      >
                        Manuscript
                      </a>
                      {version.responseStoredFile ? (
                        <a
                          href={`/api/admin/${journal.slug}/submissions/${submission.id}/versions/${version.id}/response`}
                          className="hover:text-[color:var(--color-accent)]"
                        >
                          Response
                        </a>
                      ) : null}
                    </div>
                  </div>
                  {version.authorNote ? (
                    <p className="mt-2 text-xs leading-5 text-[color:var(--color-muted)]">
                      {version.authorNote}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>

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
                <div className="mb-6 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
                  <AssignmentForm
                    journalSlug={journal.slug}
                    submissionId={submission.id}
                    editors={editors}
                  />
                  {editors.length < 2 ? (
                    <p className="mt-3 text-xs text-[color:var(--color-danger)]">
                      At least two active editors in this journal are required
                      to begin peer review.
                    </p>
                  ) : null}
                </div>
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
                      <div className="rounded-[var(--radius-md)] bg-[color:var(--color-surface)] p-4 sm:col-span-2">
                        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-5">
                          <Metric
                            label="Originality"
                            value={assignment.review.originality}
                          />
                          <Metric
                            label="Methodology"
                            value={assignment.review.methodology}
                          />
                          <Metric
                            label="Clarity"
                            value={assignment.review.clarity}
                          />
                          <Metric
                            label="Relevance"
                            value={assignment.review.relevance}
                          />
                          <Metric
                            label="Recommendation"
                            value={
                              assignment.review.recommendation?.replaceAll(
                                "_",
                                " ",
                              ) ?? "—"
                            }
                          />
                        </div>
                        <p className="mt-4 text-sm leading-6 whitespace-pre-wrap">
                          <span className="font-semibold">To author:</span>{" "}
                          {assignment.review.commentsToAuthor}
                        </p>
                        {assignment.review.confidentialComments ? (
                          <p className="mt-3 border-l-2 border-[color:var(--color-accent-secondary)] pl-3 text-sm leading-6 whitespace-pre-wrap">
                            <span className="font-semibold">Confidential:</span>{" "}
                            {assignment.review.confidentialComments}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              {submittedReviews.length ? (
                <div className="mt-6 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] p-5">
                  <h3 className="text-sm font-semibold">Review summary</h3>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Metric
                      label="Originality average"
                      value={score(
                        submittedReviews.map(
                          ({ review }) => review!.originality,
                        ),
                      )}
                    />
                    <Metric
                      label="Methodology average"
                      value={score(
                        submittedReviews.map(
                          ({ review }) => review!.methodology,
                        ),
                      )}
                    />
                    <Metric
                      label="Clarity average"
                      value={score(
                        submittedReviews.map(({ review }) => review!.clarity),
                      )}
                    />
                    <Metric
                      label="Relevance average"
                      value={score(
                        submittedReviews.map(({ review }) => review!.relevance),
                      )}
                    />
                  </div>
                </div>
              ) : null}

              {submission.status === "REVIEWS_RECEIVED" &&
              !currentRound.decisions.length ? (
                <div className="mt-8 rounded-[var(--radius-lg)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] p-5 sm:p-6">
                  <h3 className="text-sm font-semibold">Editorial decision</h3>
                  <p className="mt-2 text-xs leading-5 text-[color:var(--color-subtle)]">
                    Reviews inform the decision; they do not make it
                    automatically.
                  </p>
                  <div className="mt-5">
                    <DecisionForm
                      journalSlug={journal.slug}
                      submissionId={submission.id}
                      roundId={currentRound.id}
                    />
                  </div>
                </div>
              ) : null}
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
                <p className="text-xs leading-5 text-[color:var(--color-muted)]">
                  Assign the tracking ID from the submission request before
                  beginning editorial assessment.
                </p>
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
                <p className="text-xs leading-5 text-[color:var(--color-muted)]">
                  Waiting for the author to upload a revised manuscript.
                </p>
              ) : null}
              {[
                "AWAITING_REVIEWERS",
                "UNDER_REVIEW",
                "REVIEWS_RECEIVED",
              ].includes(submission.status) ? (
                <p className="text-xs leading-5 text-[color:var(--color-muted)]">
                  Manage the current review round in the main panel.
                </p>
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
              {submission.events.map((event) => (
                <li key={event.id} className="relative pb-5 last:pb-0">
                  <span className="absolute top-1.5 -left-[1.42rem] size-2 rounded-full bg-[color:var(--color-accent)]" />
                  <p className="text-xs font-semibold">
                    {event.type.replaceAll("_", " ").toLowerCase()}
                  </p>
                  <p className="mt-1 text-[11px] text-[color:var(--color-subtle)]">
                    {date.format(event.createdAt)}
                    {event.actor ? ` · ${event.actor.displayName}` : ""}
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

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.08em] text-[color:var(--color-subtle)] uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold capitalize">{value ?? "—"}</p>
    </div>
  );
}
