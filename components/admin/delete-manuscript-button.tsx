"use client";

import { useState, useTransition } from "react";
import { deleteManuscriptAdminAction } from "@/app/admin/submissions/actions";

interface DeleteManuscriptButtonProps {
  submissionId: string;
  submissionTitle?: string;
  journalSlug?: string;
  redirectTo?: string;
  variant?: "icon" | "button";
  className?: string;
}

export function DeleteManuscriptButton({
  submissionId,
  submissionTitle = "this manuscript",
  redirectTo,
  variant = "icon",
  className = "",
}: DeleteManuscriptButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteManuscriptAdminAction(submissionId, redirectTo);
        setShowConfirm(false);
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof (err as { digest: string }).digest === "string" &&
          (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
          throw err;
        }
        setError(
          err instanceof Error ? err.message : "Failed to delete manuscript",
        );
      }
    });
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowConfirm(true);
          }}
          title="Delete manuscript submission"
          aria-label="Delete manuscript"
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 disabled:opacity-50 ${className}`}
        >
          {isPending ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
          ) : (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          )}
        </button>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => setShowConfirm(true)}
          className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50 ${className}`}
        >
          {isPending ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
          ) : (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          )}
          <span>{isPending ? "Deleting…" : "Delete Manuscript"}</span>
        </button>
      )}

      {/* Confirmation Modal */}
      {showConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div
            className="w-full max-w-md rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="delete-dialog-title"
                  className="text-base font-semibold text-[color:var(--color-foreground)]"
                >
                  Delete Manuscript Submission
                </h3>
                <p className="mt-2 text-xs leading-5 text-[color:var(--color-muted)]">
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-[color:var(--color-foreground)]">
                    “{submissionTitle}”
                  </strong>
                  ?
                </p>
                <p className="mt-1.5 text-xs text-red-400/90">
                  This will permanently remove the submission record, author
                  files, and review history from the system. This action cannot
                  be undone.
                </p>
                {error ? (
                  <p className="mt-2 rounded bg-red-500/10 p-2 text-xs font-semibold text-red-400">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-[color:var(--color-border)] pt-4">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowConfirm(false)}
                className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-2 text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <span>Yes, delete manuscript</span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
