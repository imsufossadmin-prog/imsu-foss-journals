import Link from "next/link";

import { startRequestAction } from "@/app/author/requests/actions";
import {
  RequestStatus,
  StartSubmissionForm,
} from "@/components/requests/request-components";
import { requireApplicationArea } from "@/lib/auth/authorization";
import {
  getActiveDepartmentJournals,
  listAuthorRequests,
} from "@/lib/requests/data";

import { getJournalActivationMap } from "@/lib/editorial/journal-activation";
import { getReviewerApplicationForUser } from "@/lib/editorial/reviewer-applications-store";

const date = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AuthorPage() {
  const user = await requireApplicationArea("author");
  const [requests, journals, activationMap, reviewerApp] = await Promise.all([
    listAuthorRequests(user.id),
    getActiveDepartmentJournals(),
    getJournalActivationMap(),
    getReviewerApplicationForUser({ id: user.id, email: user.email ?? "" }),
  ]);

  const activeJournals = journals
    .filter((j) => Boolean(activationMap[j.slug]))
    .map((j) => ({
      ...j,
      isActivated: true,
    }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-col gap-6 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
              Author workspace
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
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
            Submit an article
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--color-muted)]">
            Select your journal and start your submission request. Your
            conversation, manuscript, and tracking ID stay together.
          </p>
        </div>
        <StartSubmissionForm
          action={startRequestAction}
          journals={activeJournals}
        />
      </header>

      <section>
        <h2 className="text-sm font-semibold">Your submission requests</h2>
        {requests.length ? (
          <div className="mt-4 space-y-3">
            {requests.map((request) => (
              <Link
                key={request.id}
                href={`/author/requests/${request.id}`}
                prefetch={true}
                className="group flex flex-col justify-between rounded-[var(--radius-lg)] bg-[color:var(--color-surface-raised)] p-5 transition hover:bg-[color:var(--color-surface-strong)] sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold group-hover:text-[color:var(--color-accent)]">
                    {request.submission?.title ??
                      `${request.department?.name ?? request.journal.name} submission request`}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                    {request._count.messages} conversation updates
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4 sm:mt-0 sm:justify-end">
                  <RequestStatus status={request.status} />
                  <p className="text-xs text-[color:var(--color-subtle)]">
                    Updated {date.format(request.updatedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] bg-[color:var(--color-surface-raised)] p-8 text-center">
            <p className="text-sm font-semibold">
              No active submission requests
            </p>
            <p className="mt-1 text-xs text-[color:var(--color-muted)]">
              Select a department above and click &quot;Start request&quot; to
              talk with the journal team.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
