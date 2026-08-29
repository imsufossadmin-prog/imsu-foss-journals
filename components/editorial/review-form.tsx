"use client";

import type { ReviewRecommendation } from "@prisma/client";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveReviewAction } from "@/app/editor/[journalSlug]/assignments/actions";
import { scorecardDimensions } from "@/lib/editorial/validation";
import type { ActionState } from "@/lib/submissions/types";

export type ReviewValue = {
  id?: string;
  status: "DRAFT" | "SUBMITTED";
  titleAbstract?: number | null;
  introductionThesis?: number | null;
  literatureReview?: number | null;
  methodology?: number | null;
  resultsDiscussion?: number | null;
  conclusion?: number | null;
  languageStyle?: number | null;
  apaAdherence?: number | null;
  generalReport?: string | null;
  originality?: number | null;
  clarity?: number | null;
  relevance?: number | null;
  recommendation: ReviewRecommendation | null;
  commentsToAuthor: string | null;
  confidentialComments?: string | null;
  version: number;
  attachments?: Array<{
    id: string;
    storedFile: {
      id: string;
      originalFileName: string;
      sizeBytes: bigint | number;
      mimeType: string;
    };
  }>;
} | null;

function ReviewButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <button
        type="submit"
        className="button-secondary text-xs"
        name="intent"
        value="draft"
        disabled={pending}
      >
        {pending ? "Saving…" : "Save Draft"}
      </button>
      <button
        type="submit"
        className="button-primary text-xs"
        name="intent"
        value="submit"
        disabled={pending}
      >
        {pending ? "Submitting…" : "Submit Review"}
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
  const [state, formAction] = useActionState(bound, {} as ActionState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const d of scorecardDimensions) {
      const val = review?.[d.key as keyof NonNullable<ReviewValue>];
      initial[d.key] = typeof val === "number" ? val : 0;
    }
    return initial;
  });

  const [attachments, setAttachments] = useState<File[]>([]);

  const handleScoreChange = (key: string, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
      e.target.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (formData: FormData) => {
    // Append all staged attachments to the submission FormData
    formData.delete("attachments");
    for (const file of attachments) {
      formData.append("attachments", file);
    }
    formAction(formData);
  };

  const validScores = Object.values(scores).filter((s) => s > 0);
  const averageScore =
    validScores.length > 0
      ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
      : null;

  return (
    <form action={handleSubmit} className="space-y-6">
      <input type="hidden" name="reviewVersion" value={review?.version ?? 0} />

      {/* 8 Criteria Evaluation - Compact 2-column layout */}
      <div>
        <div className="flex items-center justify-between pb-2.5">
          <p className="text-xs font-semibold text-[color:var(--color-foreground)]">
            Criteria Scores (1–10)
          </p>
          {averageScore ? (
            <span className="font-mono text-xs font-bold text-[color:var(--color-accent)]">
              Average: {averageScore} / 10
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {scorecardDimensions.map((dimension, idx) => {
            const currentScore = scores[dimension.key] || 0;
            return (
              <div
                key={dimension.key}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3.5 py-2.5"
              >
                <label
                  htmlFor={`score-${dimension.key}`}
                  className="min-w-0 flex-1 text-xs leading-normal font-medium text-[color:var(--color-foreground)]"
                >
                  <span className="mr-1.5 font-semibold text-[color:var(--color-subtle)]">
                    {idx + 1}.
                  </span>
                  <span>{dimension.label}</span>
                </label>

                <select
                  id={`score-${dimension.key}`}
                  name={dimension.key}
                  value={currentScore > 0 ? currentScore : ""}
                  onChange={(e) =>
                    handleScoreChange(dimension.key, Number(e.target.value))
                  }
                  className="h-8 w-20 shrink-0 rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-2 py-1 text-center font-mono text-xs font-semibold text-[color:var(--color-foreground)] focus:border-[color:var(--color-accent)] focus:outline-none"
                >
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* General Review Report & Integrated Attachments */}
      <div className="space-y-3">
        <label
          htmlFor="generalReport"
          className="block text-xs font-semibold text-[color:var(--color-foreground)]"
        >
          9. General Review Report
        </label>

        <textarea
          id="generalReport"
          name="generalReport"
          className="app-field min-h-48 text-xs leading-relaxed"
          defaultValue={review?.generalReport ?? review?.commentsToAuthor ?? ""}
          placeholder="Provide your comprehensive academic review report here..."
        />
        {state.fieldErrors?.generalReport ? (
          <span className="block text-xs text-[color:var(--color-danger)]">
            {state.fieldErrors.generalReport}
          </span>
        ) : null}

        {/* Integrated Attachments Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="button-secondary inline-flex items-center gap-1.5 py-1 text-xs"
          >
            <span>+ Attach files</span>
          </button>

          {/* Staged files to be uploaded */}
          {attachments.map((file, idx) => (
            <span
              key={`${file.name}-${idx}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-accent)]/50 bg-[color:var(--color-surface)] px-2.5 py-0.5 text-xs text-[color:var(--color-foreground)]"
            >
              <span>📎</span>
              <span className="max-w-[160px] truncate">{file.name}</span>
              <span className="text-[10px] text-[color:var(--color-subtle)]">
                ({Math.round(file.size / 1024)} KB)
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFile(idx)}
                className="ml-0.5 text-[color:var(--color-subtle)] hover:text-[color:var(--color-danger)]"
                title="Remove file"
              >
                ✕
              </button>
            </span>
          ))}

          {/* Previously submitted review attachments */}
          {review?.attachments?.map((att) => (
            <a
              key={att.id}
              href={`/api/editor/${journalSlug}/assignments/${assignmentId}/attachments/${att.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 py-0.5 text-xs text-[color:var(--color-foreground)] hover:border-[color:var(--color-accent)]"
            >
              <span>📎</span>
              <span className="max-w-[160px] truncate">
                {att.storedFile.originalFileName}
              </span>
              <span className="text-[10px] text-[color:var(--color-subtle)]">
                ({Math.round(Number(att.storedFile.sizeBytes) / 1024)} KB)
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Editorial Recommendation */}
      <div className="space-y-1.5">
        <label
          htmlFor="recommendation"
          className="block text-xs font-semibold text-[color:var(--color-foreground)]"
        >
          Editorial Recommendation
        </label>
        <select
          id="recommendation"
          name="recommendation"
          className="app-field text-xs sm:max-w-xs"
          defaultValue={review?.recommendation ?? ""}
        >
          <option value="">Choose recommendation</option>
          <option value="ACCEPT">Accept Manuscript</option>
          <option value="MINOR_REVISION">Minor Revision Required</option>
          <option value="MAJOR_REVISION">Major Revision Required</option>
          <option value="REJECT">Reject Manuscript</option>
        </select>
        {state.fieldErrors?.recommendation ? (
          <span className="block text-xs text-[color:var(--color-danger)]">
            {state.fieldErrors.recommendation}
          </span>
        ) : null}
      </div>

      <ReviewButtons />

      {state.error || state.message ? (
        <p
          role={state.error ? "alert" : "status"}
          className={`text-xs font-medium ${state.error ? "text-[color:var(--color-danger)]" : "text-[color:var(--color-accent)]"}`}
        >
          {state.error ?? state.message}
        </p>
      ) : null}
    </form>
  );
}
