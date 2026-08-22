import Link from "next/link";

import {
  submissionStepLabels,
  submissionSteps,
  type SubmissionStep,
} from "@/lib/submissions/constants";

export function SubmissionProgress({
  submissionId,
  currentStep,
}: {
  submissionId: string;
  currentStep: SubmissionStep;
}) {
  const currentIndex = submissionSteps.indexOf(currentStep);
  return (
    <nav aria-label="Submission progress" className="mb-10 sm:mb-12">
      <div className="flex items-center justify-between gap-4 md:hidden">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.11em] text-[color:var(--color-subtle)] uppercase">
            Step {currentIndex + 1} of {submissionSteps.length}
          </p>
          <p className="mt-1 text-sm font-semibold text-[color:var(--color-foreground)]">
            {submissionStepLabels[currentStep]}
          </p>
        </div>
        <span className="text-xs text-[color:var(--color-subtle)]">
          {Math.round(((currentIndex + 1) / submissionSteps.length) * 100)}%
        </span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[color:var(--color-border)] md:hidden">
        <div
          className="h-full rounded-full bg-[color:var(--color-accent)] transition-[width]"
          style={{
            width: `${((currentIndex + 1) / submissionSteps.length) * 100}%`,
          }}
        />
      </div>

      <ol className="hidden grid-cols-6 border-b border-[color:var(--color-border)] md:grid">
        {submissionSteps.map((step, index) => (
          <li key={step}>
            <Link
              href={`/author/submissions/${submissionId}/edit/${step}`}
              aria-current={step === currentStep ? "step" : undefined}
              className="relative block px-2 pb-4 text-center text-xs font-semibold text-[color:var(--color-subtle)] transition hover:text-[color:var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)] aria-[current=step]:text-[color:var(--color-foreground)]"
            >
              <span className="mr-1 text-[10px] font-medium">{index + 1}</span>
              {submissionStepLabels[step]}
              {step === currentStep ? (
                <span className="absolute right-2 -bottom-px left-2 h-0.5 rounded-full bg-[color:var(--color-accent)]" />
              ) : null}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
