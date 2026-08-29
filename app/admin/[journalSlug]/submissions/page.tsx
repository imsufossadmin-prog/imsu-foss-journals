import Link from "next/link";

import {
  SubmissionStatus,
  getSubmissionStatusLabel,
} from "@/components/submissions/submission-status";
import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import {
  editorialInboxStatuses,
  listEditorialSubmissions,
  submissionStatusFromQuery,
} from "@/lib/editorial/data";

const shortDate = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function SubmissionInboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ journalSlug: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { journalSlug } = await params;
  const query = await searchParams;
  const { journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  const status = submissionStatusFromQuery(query.status);
  const submissions = await listEditorialSubmissions({
    journalId: journal.id,
    query: query.q,
    status,
  });
  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-[color:var(--color-border)] pb-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
          Editorial intake
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
          Manuscripts
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-muted)]">
          Submitted work for {journal.department?.name ?? journal.name},{" "}
          including manuscripts awaiting tracking IDs.
        </p>
      </header>
      <form className="mt-7 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto]">
        <input
          className="app-field"
          name="q"
          defaultValue={query.q}
          placeholder="Search title or tracking ID"
          aria-label="Search manuscripts"
        />
        <select
          className="app-field"
          name="status"
          defaultValue={status ?? ""}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {editorialInboxStatuses.map((item) => (
            <option key={item} value={item}>
              {getSubmissionStatusLabel(item)}
            </option>
          ))}
        </select>
        <button className="button-secondary">Apply filters</button>
      </form>
      <div className="mt-7 overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]">
        {submissions.length ? (
          <ol className="divide-y divide-[color:var(--color-border)]">
            {submissions.map((submission) => (
              <li key={submission.id}>
                <Link
                  href={`/admin/${journal.slug}/submissions/${submission.id}`}
                  className="grid gap-4 p-5 transition hover:bg-[color:var(--color-surface)] sm:grid-cols-[minmax(0,1fr)_11rem_9rem] sm:items-center"
                >
                  <div>
                    <SubmissionStatus status={submission.status} />
                    <h2 className="mt-2 truncate text-sm font-semibold">
                      {submission.title ?? "Untitled manuscript"}
                    </h2>
                    <p className="mt-1 font-mono text-[11px] text-[color:var(--color-subtle)]">
                      {submission.trackingNumber ?? "Tracking ID pending"}
                    </p>
                  </div>
                  <p className="text-xs text-[color:var(--color-muted)]">
                    {submission.reviewRounds[0]
                      ? `Round ${submission.reviewRounds[0].roundNumber}`
                      : submission.trackingNumber
                        ? "Ready for assessment"
                        : "Assign tracking ID"}
                  </p>
                  <p className="text-xs text-[color:var(--color-subtle)] sm:text-right">
                    {shortDate.format(submission.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="px-6 py-16 text-center text-sm">
            No manuscripts match this view.
          </div>
        )}
      </div>
    </div>
  );
}
