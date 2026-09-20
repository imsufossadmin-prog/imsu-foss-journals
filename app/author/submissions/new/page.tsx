import Link from "next/link";
import { redirect } from "next/navigation";
import { DirectArticleSubmissionForm } from "@/components/submissions/direct-submission-form";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { getActiveDepartmentJournals } from "@/lib/requests/data";
import { getJournalActivationMap } from "@/lib/editorial/journal-activation";

export default async function NewDirectSubmissionPage({
  searchParams,
}: {
  searchParams?: Promise<{ journal?: string }>;
}) {
  const user = await requireApplicationArea("author");
  const params = searchParams ? await searchParams : undefined;
  const targetJournalSlug = params?.journal ?? "";

  const [journals, activationMap] = await Promise.all([
    getActiveDepartmentJournals(),
    getJournalActivationMap(),
  ]);

  const activeJournals = journals.filter((j) => Boolean(activationMap[j.slug]));

  if (activeJournals.length === 0) {
    redirect("/author");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href="/author"
          className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
        >
          ← Back to Author Workspace
        </Link>

        <header className="mt-6 border-b border-[color:var(--color-border)] pb-6">
          <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
            Author Direct Submission
          </p>
          <h1 className="mt-3 font-serif text-3xl font-medium tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-4xl">
            Submit an Article
          </h1>
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
            Complete the 1-page submission form below to submit your manuscript
            directly to the IMSU Faculty of Social Sciences journal editorial
            secretariat.
          </p>
        </header>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 sm:p-8">
        <DirectArticleSubmissionForm
          journals={activeJournals}
          defaultJournalSlug={targetJournalSlug}
          initialAuthorName={user.displayName ?? ""}
          initialAuthorEmail={user.email ?? ""}
        />
      </div>
    </div>
  );
}
