import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AuthorsStepForm,
  DeclarationsStepForm,
  DetailsStepForm,
  FilesStep,
  FinalSubmitForm,
  JournalStepForm,
} from "@/components/submissions/submission-forms";
import { SubmissionWorkflowShell } from "@/components/submissions/submission-workflow-shell";
import { requireGlobalRole } from "@/lib/auth/authorization";
import {
  isSubmissionStep,
  type SubmissionStep,
} from "@/lib/submissions/constants";
import {
  getAuthorSubmission,
  getEligibleJournals,
} from "@/lib/submissions/data";
import { validateFinalSubmission } from "@/lib/submissions/validation";

const stepCopy: Record<
  SubmissionStep,
  { eyebrow: string; title: string; description: string }
> = {
  journal: {
    eyebrow: "Step 1 · Journal",
    title: "Confirm the journal.",
    description:
      "The journal determines where this manuscript enters editorial consideration.",
  },
  details: {
    eyebrow: "Step 2 · Details",
    title: "Describe the manuscript.",
    description:
      "Add the title and abstract reviewers and editors will use to understand the work.",
  },
  authors: {
    eyebrow: "Step 3 · Authors",
    title: "Set the authorship order.",
    description:
      "List every academic contributor in the correct order and identify one corresponding author.",
  },
  files: {
    eyebrow: "Step 4 · Files",
    title: "Add the submission files.",
    description:
      "The manuscript is required. A cover letter and one supplementary file are optional at this stage.",
  },
  declarations: {
    eyebrow: "Step 5 · Declarations",
    title: "Confirm submission readiness.",
    description:
      "These concise confirmations protect the integrity of the submission without introducing unpublished policy terms.",
  },
  review: {
    eyebrow: "Step 6 · Review",
    title: "Review everything once.",
    description:
      "Check the complete record before sending it to the journal. You can return to any section directly.",
  },
};

export default async function SubmissionStepPage({
  params,
}: {
  params: Promise<{ submissionId: string; step: string }>;
}) {
  const user = await requireGlobalRole("AUTHOR");
  const { submissionId, step } = await params;
  if (!isSubmissionStep(step)) redirect(`/author/submissions/${submissionId}`);
  const submission = await getAuthorSubmission(user.id, submissionId);
  if (!submission) redirect("/unauthorized?reason=workspace");
  if (submission.request) {
    redirect(
      `/author/requests/${submission.request.id}/submit?submission=${submission.id}`,
    );
  }
  if (submission.status !== "DRAFT")
    redirect(`/author/submissions/${submission.id}`);
  const journals = step === "journal" ? await getEligibleJournals() : [];
  const copy = stepCopy[step];

  return (
    <SubmissionWorkflowShell
      submissionId={submission.id}
      currentStep={step}
      {...copy}
    >
      {step === "journal" ? (
        <JournalStepForm
          submissionId={submission.id}
          version={submission.version}
          currentJournalId={submission.journal.id}
          journals={journals}
        />
      ) : null}
      {step === "details" ? (
        <DetailsStepForm
          submissionId={submission.id}
          version={submission.version}
          title={submission.title ?? ""}
          abstract={submission.abstract ?? ""}
          keywords={submission.keywords}
        />
      ) : null}
      {step === "authors" ? (
        <AuthorsStepForm
          submissionId={submission.id}
          version={submission.version}
          initialAuthors={submission.authors}
        />
      ) : null}
      {step === "files" ? (
        <FilesStep
          submissionId={submission.id}
          version={submission.version}
          files={submission.files}
        />
      ) : null}
      {step === "declarations" ? (
        <DeclarationsStepForm
          submissionId={submission.id}
          version={submission.version}
          values={submission}
        />
      ) : null}
      {step === "review" ? <ReviewSummary submission={submission} /> : null}
    </SubmissionWorkflowShell>
  );
}

function ReviewSummary({
  submission,
}: {
  submission: NonNullable<Awaited<ReturnType<typeof getAuthorSubmission>>>;
}) {
  const sections = [
    { label: "Journal", value: submission.journal.name, step: "journal" },
    {
      label: "Manuscript details",
      value: submission.title ?? "Not completed",
      step: "details",
    },
    {
      label: "Authors",
      value: submission.authors.length
        ? submission.authors.map(({ fullName }) => fullName).join(", ")
        : "Not completed",
      step: "authors",
    },
    {
      label: "Files",
      value: submission.files.length
        ? submission.files
            .map(({ originalFileName }) => originalFileName)
            .join(", ")
        : "Not completed",
      step: "files",
    },
    {
      label: "Declarations",
      value:
        submission.declarationAccuracy &&
        submission.declarationAuthority &&
        submission.declarationReadiness
          ? "All confirmed"
          : "Not completed",
      step: "declarations",
    },
  ];
  const issues = validateFinalSubmission(submission);
  return (
    <div className="max-w-4xl">
      <dl className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
        {sections.map((section) => (
          <div
            key={section.label}
            className="grid gap-3 py-5 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-start sm:px-3"
          >
            <dt className="text-xs font-semibold text-[color:var(--color-subtle)]">
              {section.label}
            </dt>
            <dd className="text-sm leading-6 text-[color:var(--color-foreground)]">
              {section.value}
            </dd>
            <dd>
              <Link
                className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
                href={`/author/submissions/${submission.id}/edit/${section.step}`}
              >
                Edit
              </Link>
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 rounded-[var(--radius-lg)] bg-[color:var(--color-surface-strong)] p-5 text-sm leading-6 text-[color:var(--color-muted)]">
        Submitting locks this version for editorial consideration. Future
        changes will require an explicit revision workflow.
      </div>
      <FinalSubmitForm submissionId={submission.id} issues={issues} />
    </div>
  );
}
