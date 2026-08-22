import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteDraftAction } from "@/app/author/submissions/actions";
import { PendingButton } from "@/components/submissions/pending-button";
import { requireGlobalRole } from "@/lib/auth/authorization";
import { getAuthorSubmission } from "@/lib/submissions/data";

export default async function DeleteDraftPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const user = await requireGlobalRole("AUTHOR");
  const { submissionId } = await params;
  const submission = await getAuthorSubmission(user.id, submissionId);
  if (!submission) redirect("/unauthorized?reason=workspace");
  if (submission.status !== "DRAFT")
    redirect(`/author/submissions/${submission.id}`);
  const action = deleteDraftAction.bind(null, submission.id);
  return (
    <div className="mx-auto max-w-2xl py-10 sm:py-16">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-[color:var(--color-danger)] uppercase">
        Delete draft
      </p>
      <h1 className="mt-4 font-serif text-4xl leading-tight font-medium tracking-[-0.035em]">
        Remove this unfinished submission?
      </h1>
      <p className="mt-5 text-base leading-7 text-[color:var(--color-muted)]">
        “{submission.title ?? "Untitled manuscript"}” and its private uploaded
        files will be removed. Submitted manuscripts cannot be deleted this way.
      </p>
      <div className="mt-9 flex flex-wrap gap-3 border-t border-[color:var(--color-border)] pt-6">
        <form action={action}>
          <PendingButton
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-danger)] px-5 text-sm font-bold text-white"
            pendingLabel="Deleting draft…"
          >
            Delete draft
          </PendingButton>
        </form>
        <Link
          href={`/author/submissions/${submission.id}`}
          className="button-secondary"
        >
          Keep draft
        </Link>
      </div>
    </div>
  );
}
