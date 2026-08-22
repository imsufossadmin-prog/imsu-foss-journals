"use client";

import type { ReviewRecommendation } from "@prisma/client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveReviewAction } from "@/app/editor/[journalSlug]/assignments/actions";
import type { ActionState } from "@/lib/submissions/types";

type ReviewValue = {
  status: "DRAFT" | "SUBMITTED";
  originality: number | null;
  methodology: number | null;
  clarity: number | null;
  relevance: number | null;
  recommendation: ReviewRecommendation | null;
  commentsToAuthor: string | null;
  confidentialComments: string | null;
  version: number;
} | null;

const labels = {
  originality: "Originality",
  methodology: "Methodology",
  clarity: "Clarity",
  relevance: "Relevance",
} as const;

function ReviewButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3">
      <button
        className="button-secondary"
        name="intent"
        value="draft"
        disabled={pending}
      >
        {pending ? "Saving…" : "Save draft"}
      </button>
      <button
        className="button-primary"
        name="intent"
        value="submit"
        disabled={pending}
      >
        {pending ? "Submitting…" : "Submit final review"}
      </button>
    </div>
  );
}

export function ReviewForm({
  journalSlug,
  assignmentId,
  review,
}: {
  journalSlug: string;
  assignmentId: string;
  review: ReviewValue;
}) {
  const bound = saveReviewAction.bind(null, journalSlug, assignmentId);
  const [state, action] = useActionState(bound, {} as ActionState);
  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="reviewVersion" value={review?.version ?? 0} />
      <fieldset>
        <legend className="text-sm font-semibold">Structured assessment</legend>
        <p className="mt-2 text-xs leading-5 text-[color:var(--color-subtle)]">
          Score each dimension from 1 (weak) to 5 (excellent).
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {Object.entries(labels).map(([name, label]) => (
            <label key={name} className="text-xs font-semibold">
              {label}
              <select
                name={name}
                className="app-field mt-2"
                defaultValue={review?.[name as keyof typeof labels] ?? ""}
              >
                <option value="">Not scored</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.[name] ? (
                <span className="mt-1 block text-[color:var(--color-danger)]">
                  {state.fieldErrors[name]}
                </span>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-semibold">
        Recommendation
        <select
          name="recommendation"
          className="app-field mt-2"
          defaultValue={review?.recommendation ?? ""}
        >
          <option value="">Choose when ready</option>
          <option value="ACCEPT">Accept</option>
          <option value="MINOR_REVISION">Minor revision</option>
          <option value="MAJOR_REVISION">Major revision</option>
          <option value="REJECT">Reject</option>
        </select>
        {state.fieldErrors?.recommendation ? (
          <span className="mt-1 block text-xs text-[color:var(--color-danger)]">
            {state.fieldErrors.recommendation}
          </span>
        ) : null}
      </label>

      <label className="block text-sm font-semibold">
        Comments to the author
        <textarea
          name="commentsToAuthor"
          className="app-field mt-2 min-h-44"
          defaultValue={review?.commentsToAuthor ?? ""}
          placeholder="Give specific, constructive feedback without identifying yourself."
        />
        {state.fieldErrors?.commentsToAuthor ? (
          <span className="mt-1 block text-xs text-[color:var(--color-danger)]">
            {state.fieldErrors.commentsToAuthor}
          </span>
        ) : null}
      </label>

      <label className="block text-sm font-semibold">
        Confidential comments to the administrator
        <textarea
          name="confidentialComments"
          className="app-field mt-2 min-h-32"
          defaultValue={review?.confidentialComments ?? ""}
          placeholder="Optional. This text is never shown to the author."
        />
      </label>

      <div className="rounded-[var(--radius-md)] bg-[color:var(--color-surface)] p-4 text-xs leading-5 text-[color:var(--color-muted)]">
        Final submission locks this review. The journal administrator sees both
        comment fields; the author sees only the author comments after a
        decision.
      </div>
      <ReviewButtons />
      {state.error || state.message ? (
        <p
          role={state.error ? "alert" : "status"}
          className={`text-sm ${state.error ? "text-[color:var(--color-danger)]" : "text-[color:var(--color-accent)]"}`}
        >
          {state.error ?? state.message}
        </p>
      ) : null}
    </form>
  );
}
