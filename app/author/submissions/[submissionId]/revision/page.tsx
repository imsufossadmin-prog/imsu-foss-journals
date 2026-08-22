import Link from "next/link";
import { redirect } from "next/navigation";

import { RevisionUploadForm } from "@/components/editorial/revision-upload-form";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { getAuthorSubmission } from "@/lib/submissions/data";

export default async function RevisionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const user = await requireApplicationArea("author");
  const { submissionId } = await params;
  const submission = await getAuthorSubmission(user.id, submissionId);
  if (!submission) redirect("/unauthorized?reason=workspace");
  if (
    !["CORRECTION_REQUESTED", "REVISION_REQUESTED"].includes(submission.status)
  ) {
    redirect(`/author/submissions/${submission.id}`);
  }
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/author/submissions/${submission.id}`}
        className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
      >
        ← Submission details
      </Link>
      <header className="mt-8 border-b border-[color:var(--color-border)] pb-8">
        <p className="text-xs font-semibold tracking-[0.1em] text-[color:var(--color-accent)] uppercase">
          Revision requested
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
          Submit a new version
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--color-muted)]">
          The original manuscript remains preserved. This upload creates the
          next immutable version for reassessment and, when required, another
          review round.
        </p>
      </header>
      <div className="mt-9 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5 sm:p-7">
        <RevisionUploadForm submissionId={submission.id} />
      </div>
    </div>
  );
}
