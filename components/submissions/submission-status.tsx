const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  SCREENING: "Screening",
  CORRECTION_REQUESTED: "Correction requested",
  AWAITING_REVIEWERS: "Awaiting reviewers",
  UNDER_REVIEW: "Under review",
  REVIEWS_RECEIVED: "Reviews received",
  REVISION_REQUESTED: "Revision requested",
  REVISED: "Revised",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export function getSubmissionStatusLabel(status: string) {
  return statusLabels[status] ?? status.replaceAll("_", " ").toLowerCase();
}

export function SubmissionStatus({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--color-muted)]">
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          status === "DRAFT"
            ? "bg-[color:var(--color-accent-secondary)]"
            : "bg-[color:var(--color-accent)]"
        }`}
      />
      {getSubmissionStatusLabel(status)}
    </span>
  );
}
