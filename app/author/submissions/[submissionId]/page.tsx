import Link from "next/link";
import { redirect } from "next/navigation";

import { SubmissionStatus } from "@/components/submissions/submission-status";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { getAuthorEditorialHistory } from "@/lib/editorial/data";
import { getAuthorSubmission } from "@/lib/submissions/data";

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const user = await requireApplicationArea("author");
  const { submissionId } = await params;
  const [submission, editorial] = await Promise.all([
    getAuthorSubmission(user.id, submissionId),
    getAuthorEditorialHistory(user.id, submissionId),
  ]);
  if (!submission) redirect("/unauthorized?reason=workspace");
  const draft = submission.status === "DRAFT";
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/author/submissions"
        className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
      >
        ← All submissions
      </Link>
      <div className="mt-9 flex flex-col gap-6 border-b border-[color:var(--color-border)] pb-9 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <SubmissionStatus status={submission.status} />
          <h1 className="mt-4 font-serif text-4xl leading-tight font-medium tracking-[-0.035em] sm:text-5xl">
            {submission.title ?? "Untitled manuscript"}
          </h1>
          <p className="mt-3 text-sm text-[color:var(--color-muted)]">
            {submission.journal.name}
          </p>
          {submission.trackingNumber ? (
            <p className="mt-2 font-mono text-xs text-[color:var(--color-subtle)]">
              {submission.trackingNumber}
            </p>
          ) : null}
        </div>
        {draft ? (
          <Link
            href={`/author/submissions/${submission.id}/edit/details`}
            className="button-primary shrink-0"
          >
            Continue editing
          </Link>
        ) : ["CORRECTION_REQUESTED", "REVISION_REQUESTED"].includes(
            submission.status,
          ) ? (
          <Link
            href={`/author/submissions/${submission.id}/revision`}
            className="button-primary shrink-0"
          >
            Submit revision
          </Link>
        ) : null}
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="space-y-10">
          <DetailSection title="Manuscript details">
            <p className="text-sm leading-7 text-[color:var(--color-muted)]">
              {submission.abstract ?? "The abstract has not been added yet."}
            </p>
            {submission.keywords.length ? (
              <p className="mt-4 text-xs text-[color:var(--color-subtle)]">
                {submission.keywords.join(" · ")}
              </p>
            ) : null}
          </DetailSection>
          <DetailSection title="Academic authors">
            {submission.authors.length ? (
              <ol className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
                {submission.authors.map((author) => (
                  <li key={author.id} className="py-4 text-sm">
                    <span className="font-semibold">
                      {author.position}. {author.fullName}
                    </span>
                    {author.isCorrespondingAuthor ? (
                      <span className="ml-2 text-xs text-[color:var(--color-accent)]">
                        Corresponding
                      </span>
                    ) : null}
                    <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                      {author.affiliation || "Affiliation not provided"}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-[color:var(--color-muted)]">
                No authors added yet.
              </p>
            )}
          </DetailSection>
          <DetailSection title="Files">
            {submission.files.length ? (
              <div className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
                {submission.files.map((file) => (
                  <a
                    key={file.id}
                    href={`/api/author/submissions/${submission.id}/files/${file.id}`}
                    className="flex min-h-14 items-center justify-between gap-4 py-3 text-sm font-semibold hover:text-[color:var(--color-accent)]"
                  >
                    <span className="truncate">{file.originalFileName}</span>
                    <span className="text-[10px] font-medium text-[color:var(--color-subtle)]">
                      Download
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--color-muted)]">
                No files uploaded yet.
              </p>
            )}
          </DetailSection>
          {editorial?.editorialDecisions.length ? (
            <DetailSection title="Editorial decisions and reviewer feedback">
              <div className="space-y-5">
                {editorial.editorialDecisions.map((decision) => (
                  <article
                    key={decision.id}
                    className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold capitalize">
                        {decision.type.toLowerCase().replaceAll("_", " ")}
                      </h3>
                      <p className="text-xs text-[color:var(--color-subtle)]">
                        {dateFormatter.format(decision.decidedAt)}
                      </p>
                    </div>
                    <p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-[color:var(--color-muted)]">
                      {decision.authorMessage}
                    </p>
                    {decision.revisionDueAt ? (
                      <p className="mt-3 text-xs font-semibold text-[color:var(--color-accent)]">
                        Revision due{" "}
                        {dateFormatter.format(decision.revisionDueAt)}
                      </p>
                    ) : null}
                    {decision.reviewRound ? (
                      <div className="mt-5 border-t border-[color:var(--color-border)] pt-5">
                        <p className="text-xs font-semibold">
                          Round {decision.reviewRound.roundNumber} reviewer
                          feedback
                        </p>
                        <ol className="mt-3 space-y-3">
                          {decision.reviewRound.assignments.map(
                            ({ review }, index) =>
                              review ? (
                                <li
                                  key={index}
                                  className="rounded-[var(--radius-md)] bg-[color:var(--color-surface)] p-4 text-sm leading-6"
                                >
                                  <p className="text-xs font-semibold">
                                    Reviewer {index + 1} ·{" "}
                                    {review.recommendation
                                      ?.toLowerCase()
                                      .replaceAll("_", " ")}
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap text-[color:var(--color-muted)]">
                                    {review.commentsToAuthor}
                                  </p>
                                </li>
                              ) : null,
                          )}
                        </ol>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </DetailSection>
          ) : null}
          {editorial?.manuscriptVersions.length ? (
            <DetailSection title="Manuscript versions">
              <div className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
                {editorial.manuscriptVersions.map((version) => (
                  <div key={version.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          Version {version.versionNumber} ·{" "}
                          {version.kind.toLowerCase()}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                          {dateFormatter.format(version.submittedAt)} ·{" "}
                          {version.manuscriptStoredFile.originalFileName}
                        </p>
                      </div>
                      <div className="flex gap-3 text-xs font-semibold">
                        <a
                          href={`/api/author/submissions/${submission.id}/versions/${version.id}/manuscript`}
                          className="hover:text-[color:var(--color-accent)]"
                        >
                          Manuscript
                        </a>
                        {version.responseStoredFile ? (
                          <a
                            href={`/api/author/submissions/${submission.id}/versions/${version.id}/response`}
                            className="hover:text-[color:var(--color-accent)]"
                          >
                            Response
                          </a>
                        ) : null}
                      </div>
                    </div>
                    {version.authorNote ? (
                      <p className="mt-2 text-xs leading-5 text-[color:var(--color-muted)]">
                        {version.authorNote}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </DetailSection>
          ) : null}
        </div>
        <aside>
          <h2 className="text-sm font-semibold">Timeline</h2>
          <ol className="mt-5 border-l border-[color:var(--color-border-strong)] pl-5">
            <TimelineItem label="Draft created" date={submission.createdAt} />
            {submission.submittedAt ? (
              <TimelineItem label="Submitted" date={submission.submittedAt} />
            ) : null}
            {editorial?.events.map((event) => (
              <TimelineItem
                key={event.id}
                label={
                  event.message || event.type.replaceAll("_", " ").toLowerCase()
                }
                date={event.createdAt}
              />
            ))}
          </ol>
          {draft ? (
            <Link
              href={`/author/submissions/${submission.id}/delete`}
              className="mt-10 inline-block text-xs font-semibold text-[color:var(--color-danger)] hover:underline"
            >
              Delete draft
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function TimelineItem({ label, date }: { label: string; date: Date }) {
  return (
    <li className="relative pb-6 last:pb-0">
      <span className="absolute top-1.5 -left-[1.42rem] size-2 rounded-full bg-[color:var(--color-accent)]" />
      <p className="text-xs font-semibold">{label}</p>
      <p className="mt-1 text-[11px] text-[color:var(--color-subtle)]">
        {dateFormatter.format(date)}
      </p>
    </li>
  );
}
