import Link from "next/link";
import { notFound } from "next/navigation";

import { AdherenceReportForm } from "@/components/editorial/adherence-form";
import { ReviewForm } from "@/components/editorial/review-form";
import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import { getBlindedAssignment } from "@/lib/editorial/data";
import { scorecardDimensions } from "@/lib/editorial/validation";

export default async function ReviewAssignmentPage({
  params,
}: {
  params: Promise<{ journalSlug: string; assignmentId: string }>;
}) {
  const { journalSlug, assignmentId } = await params;
  const { user, journal } = await requireJournalWorkspace(
    "EDITOR",
    journalSlug,
  );
  const assignment = await getBlindedAssignment({
    journalId: journal.id,
    editorId: user.id,
    assignmentId,
  });
  if (!assignment) notFound();
  const submission = assignment.reviewRound.submission;
  const submitted = assignment.review?.status === "SUBMITTED";

  const scores = scorecardDimensions.map((d) => ({
    label: d.label,
    score: assignment.review?.[d.key as keyof typeof assignment.review] as
      number | null | undefined,
  }));
  const validScores = scores
    .map((s) => s.score)
    .filter((s): s is number => typeof s === "number" && s > 0);
  const averageScore =
    validScores.length > 0
      ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
      : null;

  const isRevision =
    submission.manuscriptVersions && submission.manuscriptVersions.length > 1;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/editor/${journal.slug}`}
        className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
      >
        ← Review assignments
      </Link>
      <header className="mt-6 border-b border-[color:var(--color-border)] pb-6">
        <p className="text-xs font-semibold tracking-[0.1em] text-[color:var(--color-accent)] uppercase">
          Blinded manuscript · Round {assignment.reviewRound.roundNumber}
        </p>
        <h1 className="mt-3 font-serif text-3xl leading-tight font-medium tracking-[-0.035em] sm:text-4xl">
          {submission.title ?? "Untitled manuscript"}
        </h1>
        <p className="mt-2 font-mono text-xs text-[color:var(--color-subtle)]">
          {submission.trackingNumber} · Version{" "}
          {assignment.reviewRound.submissionVersion.versionNumber}
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="space-y-6">
          {/* Abstract Section */}
          <section className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5">
            <h2 className="text-xs font-semibold text-[color:var(--color-subtle)] uppercase">
              Abstract
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-[color:var(--color-muted)]">
              {submission.abstract ?? "No abstract provided."}
            </p>
            {submission.keywords.length > 0 ? (
              <p className="mt-3 text-xs text-[color:var(--color-subtle)]">
                {submission.keywords.join(" · ")}
              </p>
            ) : null}
          </section>

          {/* 1. Review Scorecard & Report (Collapsible, ABOVE Adherence Report) */}
          <details
            open
            className="group rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] transition"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 select-none sm:p-5">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  Review Scorecard & Report
                </h2>
                <span className="rounded bg-[color:var(--color-surface)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-subtle)]">
                  {submitted ? "Submitted" : "Optional"}
                </span>
                {averageScore ? (
                  <span className="font-mono text-xs font-bold text-[color:var(--color-accent)]">
                    {averageScore} / 10
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-[color:var(--color-subtle)] transition-transform duration-200 group-open:rotate-180">
                ▼
              </span>
            </summary>

            <div className="border-t border-[color:var(--color-border)] p-4 sm:p-6">
              {submitted ? (
                <div className="space-y-5 text-xs">
                  <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[color:var(--color-surface)] p-3">
                    <p className="font-semibold text-[color:var(--color-accent)]">
                      ✓ Review submitted and locked.
                    </p>
                    {averageScore ? (
                      <span className="font-mono font-bold text-[color:var(--color-accent)]">
                        Average: {averageScore} / 10
                      </span>
                    ) : null}
                  </div>

                  {/* 1-10 scorecard breakdown */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {scores.map((dim, idx) => (
                      <div
                        key={dim.label}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3.5 py-2.5"
                      >
                        <span className="min-w-0 flex-1 text-xs leading-normal font-medium text-[color:var(--color-foreground)]">
                          <span className="mr-1.5 font-semibold text-[color:var(--color-subtle)]">
                            {idx + 1}.
                          </span>
                          <span>{dim.label}</span>
                        </span>
                        <span className="w-16 shrink-0 text-center font-mono text-xs font-bold text-[color:var(--color-accent)]">
                          {dim.score ? `${dim.score} / 10` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-[color:var(--color-foreground)]">
                      Recommendation
                    </p>
                    <p className="text-[color:var(--color-muted)] capitalize">
                      {assignment.review?.recommendation
                        ?.toLowerCase()
                        .replaceAll("_", " ")}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-[color:var(--color-foreground)]">
                      General Review Report
                    </p>
                    <p className="leading-relaxed whitespace-pre-wrap text-[color:var(--color-muted)]">
                      {assignment.review?.generalReport ??
                        assignment.review?.commentsToAuthor}
                    </p>
                  </div>

                  {/* Review Attachments */}
                  {assignment.review?.attachments &&
                  assignment.review.attachments.length > 0 ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-[color:var(--color-foreground)]">
                        Attached Files
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {assignment.review.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={`/api/editor/${journal.slug}/assignments/${assignment.id}/attachments/${att.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1 text-xs text-[color:var(--color-accent)] hover:underline"
                          >
                            <span>📎</span>
                            <span>{att.storedFile.originalFileName}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <ReviewForm
                  journalSlug={journal.slug}
                  assignmentId={assignment.id}
                  review={assignment.review}
                />
              )}
            </div>
          </details>

          {/* 2. Author Revision Adherence Report (Collapsible, BELOW Review Scorecard) */}
          {isRevision ? (
            <details className="group rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] transition">
              <summary className="flex cursor-pointer list-none items-center justify-between p-4 select-none sm:p-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    Author Revision Adherence
                  </h2>
                  <span className="rounded bg-[color:var(--color-surface)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-subtle)]">
                    Optional · v
                    {assignment.reviewRound.submissionVersion.versionNumber}
                  </span>
                </div>
                <span className="text-xs text-[color:var(--color-subtle)] transition-transform duration-200 group-open:rotate-180">
                  ▼
                </span>
              </summary>

              <div className="border-t border-[color:var(--color-border)] p-4 sm:p-6">
                <AdherenceReportForm
                  journalSlug={journal.slug}
                  submissionId={submission.id}
                  pastReports={submission.adherenceReports}
                />
              </div>
            </details>
          ) : null}
        </main>

        <aside>
          <div className="sticky top-24 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5">
            <h2 className="text-sm font-semibold">Manuscript file</h2>
            <p className="mt-2 text-xs leading-5 text-[color:var(--color-subtle)]">
              The download uses an opaque, server-authorized path and does not
              expose the author’s filename.
            </p>
            <a
              href={`/api/editor/${journal.slug}/assignments/${assignment.id}/manuscript`}
              className="button-primary mt-4 w-full text-xs"
            >
              Download manuscript
            </a>
            <div className="mt-4 border-t border-[color:var(--color-border)] pt-4 text-xs leading-5 text-[color:var(--color-muted)]">
              <strong>Double-blind reminder:</strong> do not attempt to identify
              the authors or include your identity in author comments.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
