import Link from "next/link";

import { SubmissionList } from "@/components/submissions/submission-list";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { listAuthorSubmissions } from "@/lib/submissions/data";

export default async function SubmissionsPage() {
  const user = await requireApplicationArea("author");
  const submissions = await listAuthorSubmissions(user.id);
  return (
    <div className="max-w-6xl">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
            Author workspace
          </p>
          <h1 className="mt-4 font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
            Submissions
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--color-muted)]">
            Drafts and submitted manuscripts remain together, with only the
            information you need to understand their current state.
          </p>
        </div>
        <Link href="/author/requests/new" className="button-primary shrink-0">
          Start submission request
        </Link>
      </div>
      <div className="mt-12">
        {submissions.length > 0 ? (
          <SubmissionList submissions={submissions} />
        ) : (
          <div className="border-y border-[color:var(--color-border)] py-12">
            <p className="text-sm font-semibold">No submissions yet</p>
            <p className="mt-2 text-sm text-[color:var(--color-muted)]">
              Start a request to contact the journal before sending your
              article.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
