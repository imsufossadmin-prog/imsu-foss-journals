"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitAdherenceReportAction } from "@/app/editor/[journalSlug]/assignments/actions";
import type { ActionState } from "@/lib/submissions/types";

export type PastAdherenceReport = {
  id: string;
  outcome: "ADHERED" | "PARTIALLY_ADHERED" | "DID_NOT_ADHERE";
  report: string;
  createdAt: Date;
  submissionVersion?: { versionNumber: number } | null;
  editor?: { displayName: string } | null;
};

function SubmitAdherenceButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button-primary text-xs" disabled={pending}>
      {pending ? "Submitting…" : "Submit Adherence Report"}
    </button>
  );
}

export function AdherenceReportForm({
  journalSlug,
  submissionId,
  pastReports,
}: {
  journalSlug: string;
  submissionId: string;
  pastReports?: PastAdherenceReport[];
}) {
  const bound = submitAdherenceReportAction.bind(
    null,
    journalSlug,
    submissionId,
  );
  const [state, action] = useActionState(bound, {} as ActionState);

  return (
    <div className="space-y-5">
      {/* Previously submitted adherence reports if any */}
      {pastReports && pastReports.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[color:var(--color-subtle)]">
            Previous Adherence Reports
          </p>
          <div className="space-y-2">
            {pastReports.map((item) => (
              <div
                key={item.id}
                className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[color:var(--color-border)] pb-2 text-xs">
                  <span
                    className={`font-semibold ${
                      item.outcome === "ADHERED"
                        ? "text-[color:var(--color-accent)]"
                        : item.outcome === "PARTIALLY_ADHERED"
                          ? "text-amber-400"
                          : "text-[color:var(--color-danger)]"
                    }`}
                  >
                    {item.outcome === "ADHERED"
                      ? "Adhered"
                      : item.outcome === "PARTIALLY_ADHERED"
                        ? "Partially Adhered"
                        : "Did Not Adhere"}
                  </span>
                  <span className="text-[11px] text-[color:var(--color-subtle)]">
                    {new Date(item.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                    })}
                    {item.editor ? ` · ${item.editor.displayName}` : ""}
                    {item.submissionVersion
                      ? ` · v${item.submissionVersion.versionNumber}`
                      : ""}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-[color:var(--color-foreground)]">
                  {item.report}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="adherence-outcome"
            className="block text-xs font-semibold text-[color:var(--color-foreground)]"
          >
            Outcome
          </label>
          <select
            id="adherence-outcome"
            name="outcome"
            required
            className="app-field text-xs sm:max-w-xs"
            defaultValue=""
          >
            <option value="" disabled>
              Select outcome
            </option>
            <option value="ADHERED">Adhered</option>
            <option value="PARTIALLY_ADHERED">Partially Adhered</option>
            <option value="DID_NOT_ADHERE">Did Not Adhere</option>
          </select>
          {state.fieldErrors?.outcome ? (
            <span className="block text-xs text-[color:var(--color-danger)]">
              {state.fieldErrors.outcome}
            </span>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="adherence-report"
            className="block text-xs font-semibold text-[color:var(--color-foreground)]"
          >
            Adherence Report
          </label>
          <textarea
            id="adherence-report"
            name="report"
            required
            className="app-field min-h-32 text-xs leading-relaxed"
            placeholder="Explain how the revision satisfies or fails the requested corrections..."
          />
          {state.fieldErrors?.report ? (
            <span className="block text-xs text-[color:var(--color-danger)]">
              {state.fieldErrors.report}
            </span>
          ) : null}
        </div>

        <SubmitAdherenceButton />

        {state.error || state.message ? (
          <p
            role={state.error ? "alert" : "status"}
            className={`text-xs font-medium ${
              state.error
                ? "text-[color:var(--color-danger)]"
                : "text-[color:var(--color-accent)]"
            }`}
          >
            {state.error ?? state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
