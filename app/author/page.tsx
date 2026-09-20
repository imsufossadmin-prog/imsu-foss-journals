import Link from "next/link";

import { SubmissionStatus } from "@/components/submissions/submission-status";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { listAuthorSubmissions } from "@/lib/submissions/data";
import { getReviewerApplicationForUser } from "@/lib/editorial/reviewer-applications-store";

const date = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AuthorPage() {
  const user = await requireApplicationArea("author");
  const [submissions, reviewerApp] = await Promise.all([
    listAuthorSubmissions(user.id),
    getReviewerApplicationForUser({ id: user.id, email: user.email ?? "" }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-col gap-6 border-b border-[color:var(--color-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
              Author Workspace
            </p>
            {reviewerApp?.status === "PENDING" ? (
              <Link
                href="/author/apply-reviewer"
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 font-mono text-[11px] font-semibold text-amber-300 transition hover:bg-amber-500/20"
              >
                <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
                <span>Reviewer Application: Pending Decision</span>
                <span aria-hidden="true">→</span>
              </Link>
            ) : reviewerApp?.status === "APPROVED" ? (
              <Link
                href="/author/apply-reviewer"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 font-mono text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span>Reviewer: Active</span>
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <Link
                href="/author/apply-reviewer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-3 py-0.5 font-mono text-[11px] font-semibold text-[color:var(--color-muted)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-foreground)]"
              >
                <span>Apply as Reviewer</span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
          <h1 className="mt-3 font-serif text-3xl font-medium tracking-[-0.035em] sm:text-4xl">
            Manuscripts & Submissions
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--color-muted)]">
            Track your submitted papers, communicate directly with the journal
            secretariat, and upload requested revisions.
          </p>
        </div>
        <div className="shrink-0">
          <Link
            href="/author/submissions/new"
            className="button-primary inline-flex items-center gap-2 text-xs"
          >
            <span>+</span> Submit an Article
          </Link>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xs font-bold tracking-wider text-[color:var(--color-foreground)] uppercase">
          Your Submitted Manuscripts
        </h2>

        {submissions.length > 0 ? (
          <div className="space-y-3">
            {submissions.map((submission) => (
              <Link
                key={submission.id}
                href={`/author/submissions/${submission.id}`}
                prefetch={true}
                className="group flex flex-col justify-between gap-4 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5 transition hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-surface-strong)] sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[color:var(--color-accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--color-accent)] uppercase">
                      {submission.journal.shortName ?? submission.journal.name}
                    </span>
                    {submission.trackingNumber ? (
                      <span className="font-mono text-xs font-semibold text-[color:var(--color-accent)]">
                        {submission.trackingNumber}
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-[color:var(--color-subtle)]">
                        Tracking ID pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold tracking-[-0.01em] text-[color:var(--color-foreground)] group-hover:text-[color:var(--color-accent)]">
                    {submission.title ?? "Untitled manuscript"}
                  </p>
                  <p className="text-xs text-[color:var(--color-subtle)]">
                    {submission.authors.length}{" "}
                    {submission.authors.length === 1 ? "Author" : "Authors"} ·
                    Updated {date.format(submission.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                  <SubmissionStatus status={submission.status} />
                  <span className="text-xs font-semibold text-[color:var(--color-accent)] group-hover:underline">
                    View Manuscript & Chat →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-12 text-center">
            <span className="text-3xl">📝</span>
            <p className="mt-3 text-base font-semibold text-[color:var(--color-foreground)]">
              No submissions yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[color:var(--color-muted)]">
              You have not submitted any manuscripts yet. Click below to submit
              your research paper to any IMSU Faculty of Social Sciences
              journal.
            </p>
            <div className="mt-5">
              <Link
                href="/author/submissions/new"
                className="button-primary inline-flex items-center gap-2 text-xs"
              >
                <span>+</span> Submit Your First Article
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
