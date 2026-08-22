import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewForm } from "@/components/editorial/review-form";
import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import { getBlindedAssignment } from "@/lib/editorial/data";

export default async function ReviewAssignmentPage({
  params,
}: {
  params: Promise<{ journalSlug: string; assignmentId: string }>;
}) {
  const { journalSlug, assignmentId } = await params;
  const { user, journal } = await requireJournalWorkspace(
    "EDITOR",
    journalSlug,
  );
  const assignment = await getBlindedAssignment({
    journalId: journal.id,
    editorId: user.id,
    assignmentId,
  });
  if (!assignment) notFound();
  const submission = assignment.reviewRound.submission;
  const submitted = assignment.review?.status === "SUBMITTED";
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/editor/${journal.slug}`}
        className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
      >
        ← Review assignments
      </Link>
      <header className="mt-8 border-b border-[color:var(--color-border)] pb-8">
        <p className="text-xs font-semibold tracking-[0.1em] text-[color:var(--color-accent)] uppercase">
          Blinded manuscript · Round {assignment.reviewRound.roundNumber}
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight font-medium tracking-[-0.035em] sm:text-5xl">
          {submission.title ?? "Untitled manuscript"}
        </h1>
        <p className="mt-3 font-mono text-xs text-[color:var(--color-subtle)]">
          {submission.trackingNumber} · manuscript version{" "}
          {assignment.reviewRound.submissionVersion.versionNumber}
        </p>
      </header>
      <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="space-y-9">
          <section>
            <h2 className="text-sm font-semibold">Abstract</h2>
            <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
              {submission.abstract ?? "No abstract provided."}
            </p>
            <p className="mt-4 text-xs text-[color:var(--color-subtle)]">
              {submission.keywords.join(" · ") || "No keywords provided"}
            </p>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5 sm:p-7">
            <h2 className="text-sm font-semibold">Review form</h2>
            <div className="mt-6">
              {submitted ? (
                <div className="space-y-5 text-sm">
                  <p className="rounded-[var(--radius-md)] bg-[color:var(--color-surface)] p-4 font-semibold text-[color:var(--color-accent)]">
                    This final review is submitted and locked.
                  </p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {(
                      [
                        "originality",
                        "methodology",
                        "clarity",
                        "relevance",
                      ] as const
                    ).map((name) => (
                      <div key={name}>
                        <p className="text-[10px] font-semibold tracking-[0.08em] text-[color:var(--color-subtle)] uppercase">
                          {name}
                        </p>
                        <p className="mt-1 font-semibold">
                          {assignment.review?.[name]}/5
                        </p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="font-semibold">Recommendation</p>
                    <p className="mt-1 text-[color:var(--color-muted)] capitalize">
                      {assignment.review?.recommendation
                        ?.toLowerCase()
                        .replaceAll("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">Comments to author</p>
                    <p className="mt-2 leading-7 whitespace-pre-wrap text-[color:var(--color-muted)]">
                      {assignment.review?.commentsToAuthor}
                    </p>
                  </div>
                  {assignment.review?.confidentialComments ? (
                    <div>
                      <p className="font-semibold">Confidential comments</p>
                      <p className="mt-2 leading-7 whitespace-pre-wrap text-[color:var(--color-muted)]">
                        {assignment.review.confidentialComments}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <ReviewForm
                  journalSlug={journal.slug}
                  assignmentId={assignment.id}
                  review={assignment.review}
                />
              )}
            </div>
          </section>
        </main>
        <aside>
          <div className="sticky top-24 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5">
            <h2 className="text-sm font-semibold">Manuscript file</h2>
            <p className="mt-2 text-xs leading-5 text-[color:var(--color-subtle)]">
              The download uses an opaque, server-authorized path and does not
              expose the author’s filename.
            </p>
            <a
              href={`/api/editor/${journal.slug}/assignments/${assignment.id}/manuscript`}
              className="button-primary mt-5 w-full"
            >
              Download manuscript
            </a>
            <div className="mt-5 border-t border-[color:var(--color-border)] pt-5 text-xs leading-5 text-[color:var(--color-muted)]">
              <strong>Double-blind reminder:</strong> do not attempt to identify
              the authors or include your identity in author comments.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
