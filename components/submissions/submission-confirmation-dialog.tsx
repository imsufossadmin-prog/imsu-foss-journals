"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};

export type FormattedJournalConfirmationInfo = {
  fullName: string;
  abbreviation: string;
  formattedSentence: string;
};

/**
 * Formats journal name, abbreviation, and the confirmation sentence.
 * Safely strips duplicate parenthesized abbreviations from the full name if already present,
 * ensuring clean display as:
 * "Your manuscript will be submitted to [JOURNAL NAME] ([ABBREVIATION]). Is this the journal you intended to select?"
 */
export function formatJournalConfirmationInfo(
  name: string,
  shortName?: string | null,
): FormattedJournalConfirmationInfo {
  const abbreviation = (shortName || "").trim();
  let fullName = (name || "").trim();

  // If the full name ends with `(${abbreviation})`, strip it off so we don't duplicate
  if (abbreviation && fullName.endsWith(`(${abbreviation})`)) {
    fullName = fullName.slice(0, -`(${abbreviation})`.length).trim();
  }

  // If abbreviation wasn't provided, extract trailing parentheses from name if present
  let finalAbbreviation = abbreviation;
  if (!finalAbbreviation) {
    const match = fullName.match(/\(([A-Z0-9\s-]+)\)$/);
    if (match) {
      finalAbbreviation = match[1].trim();
      fullName = fullName.slice(0, match.index).trim();
    }
  }

  const formattedSentence = finalAbbreviation
    ? `Your manuscript will be submitted to ${fullName} (${finalAbbreviation}). Is this the journal you intended to select?`
    : `Your manuscript will be submitted to ${fullName}. Is this the journal you intended to select?`;

  return {
    fullName,
    abbreviation: finalAbbreviation,
    formattedSentence,
  };
}

export type SubmissionConfirmationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  journalName: string;
  journalShortName?: string | null;
  manuscriptTitle: string;
  isSubmitting?: boolean;
};

export function SubmissionConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  journalName,
  journalShortName,
  manuscriptTitle,
  isSubmitting = false,
}: SubmissionConfirmationDialogProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const info = formatJournalConfirmationInfo(journalName, journalShortName);

  // Lock body scroll while dialog is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle keyboard events (Escape closes modal if not currently submitting)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Focus the primary confirmation button on open
    confirmButtonRef.current?.focus();

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-submission-dialog-title"
      aria-describedby="confirm-submission-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="animate-in fade-in fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-200"
        aria-hidden="true"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      {/* Modal Dialog Box */}
      <div className="animate-in zoom-in-95 relative z-10 w-full max-w-lg rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 shadow-2xl transition-all duration-200 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/15 text-emerald-400 shadow-inner">
            <svg
              className="size-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id="confirm-submission-dialog-title"
              className="font-serif text-xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-2xl"
            >
              Confirm your journal submission
            </h2>

            <p
              id="confirm-submission-dialog-desc"
              className="mt-2.5 text-sm leading-6 font-medium text-[color:var(--color-foreground)]"
            >
              {info.formattedSentence}
            </p>
          </div>
        </div>

        {/* Selected Values Summary Box */}
        <div className="mt-5 space-y-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-xs">
          <div>
            <span className="block text-[10px] font-semibold tracking-wider text-[color:var(--color-subtle)] uppercase">
              Target Academic Journal
            </span>
            <span className="mt-0.5 block font-medium text-[color:var(--color-foreground)]">
              {info.fullName}
            </span>
          </div>

          {info.abbreviation ? (
            <div>
              <span className="block text-[10px] font-semibold tracking-wider text-[color:var(--color-subtle)] uppercase">
                Journal Abbreviation / Code
              </span>
              <span className="mt-0.5 inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-400">
                {info.abbreviation}
              </span>
            </div>
          ) : null}

          <div>
            <span className="block text-[10px] font-semibold tracking-wider text-[color:var(--color-subtle)] uppercase">
              Manuscript Title
            </span>
            <span className="mt-0.5 line-clamp-2 block text-[color:var(--color-foreground)] italic">
              &ldquo;{manuscriptTitle.trim() || "Untitled Manuscript"}&rdquo;
            </span>
          </div>
        </div>

        {/* Advisory Context */}
        <p className="mt-4 text-[11px] leading-relaxed text-[color:var(--color-muted)]">
          Please confirm that this manuscript is intended for this academic
          journal. Once submitted, your manuscript will enter editorial
          screening with this journal secretariat.
        </p>

        {/* Modal Actions */}
        <div className="mt-6 flex flex-col-reverse gap-2.5 border-t border-[color:var(--color-border)] pt-5 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-5 py-2.5 text-xs font-semibold text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-surface-raised)] hover:text-[color:var(--color-foreground)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Go Back
          </button>

          <button
            ref={confirmButtonRef}
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-md)] bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-500 active:scale-[0.98] active:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="size-3.5 animate-spin text-current"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>Submitting manuscript…</span>
              </>
            ) : (
              <span>Confirm &amp; Submit</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
