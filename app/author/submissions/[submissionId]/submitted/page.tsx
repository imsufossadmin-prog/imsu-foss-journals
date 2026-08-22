import Link from "next/link";
import { redirect } from "next/navigation";

import { requireGlobalRole } from "@/lib/auth/authorization";
import { getAuthorSubmission } from "@/lib/submissions/data";

export default async function SubmittedPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const user = await requireGlobalRole("AUTHOR");
  const { submissionId } = await params;
  const submission = await getAuthorSubmission(user.id, submissionId);
  if (!submission) redirect("/unauthorized?reason=workspace");
  if (submission.status === "DRAFT")
    redirect(`/author/submissions/${submission.id}/edit/review`);
  return (
    <div className="mx-auto max-w-3xl py-8 sm:py-12">
      <div className="h-px w-16 bg-[color:var(--color-accent-secondary)]" />
      <p className="mt-8 text-[11px] font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
        Submission received
      </p>
      <h1 className="mt-4 font-serif text-4xl leading-tight font-medium tracking-[-0.035em] sm:text-5xl">
        Your manuscript is with the journal.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--color-muted)]">
        The submitted version is now read-only. The journal can begin its
        editorial checks without any further action from you.
      </p>
      <dl className="mt-10 divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
        <SummaryRow
          label="Tracking number"
          value={submission.trackingNumber ?? "Pending"}
          mono
        />
        <SummaryRow label="Journal" value={submission.journal.name} />
        <SummaryRow
          label="Manuscript"
          value={submission.title ?? "Untitled manuscript"}
        />
      </dl>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/author/submissions/${submission.id}`}
          className="button-primary"
        >
          Open submission
        </Link>
        <Link href="/author/submissions" className="button-secondary">
          All submissions
        </Link>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr]">
      <dt className="text-xs font-semibold text-[color:var(--color-subtle)]">
        {label}
      </dt>
      <dd
        className={`text-sm text-[color:var(--color-foreground)] ${mono ? "font-mono" : "font-semibold"}`}
      >
        {value}
      </dd>
    </div>
  );
}
