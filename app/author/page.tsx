import Link from "next/link";

import { startRequestAction } from "@/app/author/requests/actions";
import { RequestStatus } from "@/components/requests/request-components";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { listAuthorRequests } from "@/lib/requests/data";

const date = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AuthorPage() {
  const user = await requireApplicationArea("author");
  const requests = await listAuthorRequests(user.id);
  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-col gap-6 border-b border-[color:var(--color-border)] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
            Author workspace
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
            Submit an article
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--color-muted)]">
            Start by contacting the Psychology journal team. Your conversation,
            payment receipt, manuscript, and tracking ID stay together.
          </p>
        </div>
        <form action={startRequestAction}>
          <button className="button-primary">Start submission request</button>
        </form>
      </header>
      <section className="mt-8">
        <h2 className="text-sm font-semibold">Your requests</h2>
        {requests.length ? (
          <ol className="mt-4 divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {requests.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/author/requests/${request.id}`}
                  className="grid gap-4 py-5 transition hover:text-[color:var(--color-accent)] sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {request.submission?.title ??
                        `${request.department.name} submission request`}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                      {request._count.messages} conversation updates
                    </p>
                  </div>
                  <RequestStatus status={request.status} />
                  <p className="text-xs text-[color:var(--color-subtle)] sm:text-right">
                    Updated {date.format(request.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-5 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-6 py-12 text-center">
            <p className="text-sm font-semibold">No submission requests yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--color-muted)]">
              Start a request to talk with the journal team and receive payment
              instructions.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
