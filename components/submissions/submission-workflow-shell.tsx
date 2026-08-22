import Link from "next/link";
import type { ReactNode } from "react";

import { SubmissionProgress } from "@/components/submissions/submission-progress";
import type { SubmissionStep } from "@/lib/submissions/constants";

export function SubmissionWorkflowShell({
  submissionId,
  currentStep,
  eyebrow,
  title,
  description,
  children,
}: {
  submissionId: string;
  currentStep: SubmissionStep;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-7 flex justify-end">
        <Link
          href={`/author/submissions/${submissionId}`}
          className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[color:var(--color-focus)]"
        >
          Save and exit
        </Link>
      </div>
      <SubmissionProgress
        submissionId={submissionId}
        currentStep={currentStep}
      />
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight font-medium tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)] sm:text-base">
          {description}
        </p>
      </div>
      <div className="mt-9">{children}</div>
    </div>
  );
}
