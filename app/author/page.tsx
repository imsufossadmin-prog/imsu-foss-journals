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

const date = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AuthorPage() {
  const user = await requireApplicationArea("author");
  const [requests, journals] = await Promise.all([
    listAuthorRequests(user.id),
    getActiveDepartmentJournals(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-col gap-6 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
            Author workspace
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
            Submit an article
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--color-muted)]">
            Select your department and start your submission request. Your
            conversation, manuscript, and tracking ID stay together.
          </p>
        </div>
        <StartSubmissionForm action={startRequestAction} journals={journals} />
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
