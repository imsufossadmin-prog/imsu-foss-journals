import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { submitSimpleArticleAction } from "@/app/author/requests/actions";
import { CanonicalArticleSubmissionForm } from "@/components/requests/request-components";
import { requireGlobalRole } from "@/lib/auth/authorization";
import { getRequestSubmission } from "@/lib/requests/data";

export default async function SimpleSubmissionPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const user = await requireGlobalRole("AUTHOR");
  const { requestId } = await params;
  const request = await getRequestSubmission(user.id, requestId);
  if (!request) notFound();
  if (request.status !== "SUBMISSION_ENABLED" || !request.submission)
    redirect(`/author/requests/${requestId}`);
  const submission = request.submission;
  const manuscript = submission.files.find(({ type }) => type === "MANUSCRIPT");

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/author/requests/${requestId}`}
        className="text-xs font-semibold text-[color:var(--color-muted)] hover:underline"
      >
        ← Back to conversation
      </Link>
      <header className="mt-6 pb-4">
        <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
          Article submission
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
          One simple form.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--color-muted)]">
          Add the article information, upload the manuscript, then submit it to
          the journal team.
        </p>
      </header>
      <section className="mt-6 rounded-[var(--radius-lg)] bg-[color:var(--color-surface-raised)] p-5 sm:p-8">
        <CanonicalArticleSubmissionForm
          action={submitSimpleArticleAction.bind(
            null,
            requestId,
            submission.id,
          )}
          submissionId={submission.id}
          version={submission.version}
          fileName={manuscript?.storedFile.originalFileName}
          initial={{
            title: submission.title ?? "",
            abstract: submission.abstract ?? "",
            keywords: submission.keywords.join(", "),
            authors: submission.authors.map((author) => ({
              fullName: author.fullName,
              email: author.email ?? "",
              affiliation: author.affiliation ?? "",
              orcid: "",
              isCorrespondingAuthor: author.isCorrespondingAuthor,
            })),
          }}
        />
      </section>
    </div>
  );
}
