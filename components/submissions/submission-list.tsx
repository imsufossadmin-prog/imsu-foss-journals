import Link from "next/link";

import { SubmissionStatus } from "@/components/submissions/submission-status";
import type { AuthorSubmissionDTO } from "@/lib/submissions/types";

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function SubmissionList({
  submissions,
}: {
  submissions: AuthorSubmissionDTO[];
}) {
  return (
    <div className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
      {submissions.map((submission) => (
        <Link
          key={submission.id}
          href={`/author/submissions/${submission.id}`}
          className="group grid gap-4 py-5 transition hover:bg-[color:var(--color-surface-strong)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[color:var(--color-focus)] sm:grid-cols-[minmax(0,1fr)_10rem_9rem] sm:items-center sm:px-3"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[color:var(--color-foreground)] sm:text-[0.95rem]">
              {submission.title ?? "Untitled manuscript"}
            </span>
            <span className="mt-1 block truncate text-xs text-[color:var(--color-subtle)]">
              {submission.journal.name}
            </span>
          </span>
          <span>
            <SubmissionStatus status={submission.status} />
            <span className="mt-1 block font-mono text-[10px] text-[color:var(--color-subtle)]">
              {submission.trackingNumber ?? "Tracking assigned on submission"}
            </span>
          </span>
          <span className="text-xs text-[color:var(--color-subtle)] sm:text-right">
            Updated {dateFormatter.format(submission.updatedAt)}
          </span>
        </Link>
      ))}
    </div>
  );
}
