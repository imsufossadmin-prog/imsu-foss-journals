import Link from "next/link";

import { RequestStatus } from "@/components/requests/request-components";
import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import { listDepartmentRequests } from "@/lib/requests/data";

const date = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function JournalAdminPage({
  params,
}: {
  params: Promise<{ journalSlug: string }>;
}) {
  const { journalSlug } = await params;
  const { journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  const requests = await listDepartmentRequests(journal.department.id);
  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-[color:var(--color-border)] pb-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
          {journal.department.name} operations
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
          Submission requests
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--color-muted)]">
          Talk with authors, review receipts, enable submission, and assign
          tracking IDs.
        </p>
      </header>
      {requests.length ? (
        <ol className="mt-7 divide-y divide-[color:var(--color-border)] overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]">
          {requests.map((request) => (
            <li key={request.id}>
              <Link
                href={`/admin/${journal.slug}/requests/${request.id}`}
                className="grid gap-4 p-5 transition hover:bg-[color:var(--color-surface)] sm:grid-cols-[minmax(0,1fr)_12rem_9rem] sm:items-center sm:p-6"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {request.submission?.title ?? "Submission request"}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                    {request.author.displayName} · {request._count.messages}{" "}
                    updates
                  </p>
                </div>
                <RequestStatus status={request.status} />
                <p className="text-xs text-[color:var(--color-subtle)] sm:text-right">
                  {date.format(request.updatedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-7 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] px-6 py-16 text-center">
          <p className="text-sm font-semibold">No submission requests yet.</p>
          <p className="mt-2 text-xs text-[color:var(--color-subtle)]">
            New author requests will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
