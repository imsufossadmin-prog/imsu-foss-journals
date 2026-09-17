"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  deleteArticleAction,
  toggleArticlePublicationAction,
  closeIssueAdminAction,
  reopenIssueAdminAction,
  publishIssueTOCAdminAction,
} from "./actions";

export function AdminArticleRowActions({
  articleId,
  articleSlug,
  isPublished,
}: {
  articleId: string;
  articleSlug: string;
  isPublished: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleArticlePublicationAction(articleId, isPublished);
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to permanently delete this article?")) {
      return;
    }
    startTransition(async () => {
      await deleteArticleAction(articleId);
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* 1. View Public Article */}
      <Link
        href={`/articles/${articleSlug}`}
        target="_blank"
        title="View public article page"
        aria-label="View public article page"
        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-muted)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
      >
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
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </Link>

      {/* 2. Edit Article */}
      <Link
        href={`/admin/articles/${articleId}/edit`}
        prefetch={true}
        title="Edit metadata and files"
        aria-label="Edit article"
        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-muted)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
      >
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
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </Link>

      {/* 3. Publish / Unpublish Toggle */}
      <button
        type="button"
        disabled={pending}
        onClick={handleToggle}
        title={
          isPublished
            ? "Unpublish article (hide from public catalog)"
            : "Publish article"
        }
        aria-label={isPublished ? "Unpublish article" : "Publish article"}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border transition ${
          isPublished
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            : "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
        } disabled:opacity-50`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isPublished ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          )}
        </svg>
      </button>

      {/* 4. Delete Article */}
      <button
        type="button"
        disabled={pending}
        onClick={handleDelete}
        title="Delete article permanently"
        aria-label="Delete article"
        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
      >
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
      </button>
    </div>
  );
}

export function AdminIssueRowActions({
  issueId,
  isClosed,
}: {
  issueId: string;
  isClosed: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleToggleClose = () => {
    startTransition(async () => {
      try {
        if (isClosed) {
          await reopenIssueAdminAction(issueId);
          setStatusMessage("Issue reopened");
        } else {
          await closeIssueAdminAction(issueId);
          setStatusMessage("Issue closed");
        }
      } catch (err) {
        setStatusMessage(err instanceof Error ? err.message : "Action failed");
      }
      setTimeout(() => setStatusMessage(null), 3000);
    });
  };

  const handlePublishTOC = () => {
    startTransition(async () => {
      try {
        await publishIssueTOCAdminAction(issueId);
        setStatusMessage("TOC Updated & Published");
      } catch (err) {
        setStatusMessage(err instanceof Error ? err.message : "Action failed");
      }
      setTimeout(() => setStatusMessage(null), 3000);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {statusMessage ? (
        <span className="rounded bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
          ✓ {statusMessage}
        </span>
      ) : null}

      {/* Primary: Publish TOC */}
      <button
        type="button"
        disabled={pending}
        onClick={handlePublishTOC}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/25 disabled:opacity-50"
      >
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
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>Publish / Update TOC</span>
      </button>

      {/* Segmented Group: Preview, PDF, HTML */}
      <div className="inline-flex items-center divide-x divide-[color:var(--color-border)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)]">
        <a
          href="/current-issue"
          target="_blank"
          title="Preview current TOC on public site"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[color:var(--color-foreground)] transition hover:text-[color:var(--color-accent)]"
        >
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
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span>Preview</span>
        </a>

        <a
          href={`/api/issues/${issueId}/toc?format=pdf`}
          download
          title="Download TOC PDF"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[color:var(--color-foreground)] transition hover:text-[color:var(--color-accent)]"
        >
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>PDF</span>
        </a>

        <a
          href={`/api/issues/${issueId}/toc?format=html`}
          download
          title="Download TOC HTML"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[color:var(--color-muted)] transition hover:text-[color:var(--color-accent)]"
        >
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
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
          <span>HTML</span>
        </a>
      </div>

      {/* State Toggle: Close / Reopen */}
      <button
        type="button"
        disabled={pending}
        onClick={handleToggleClose}
        title={isClosed ? "Reopen issue for submissions" : "Close issue"}
        className={`inline-flex items-center gap-1 rounded-[var(--radius-md)] border px-2.5 py-1.5 text-xs font-medium transition ${
          isClosed
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            : "border-slate-500/30 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20"
        }`}
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isClosed ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
            />
          )}
        </svg>
        <span>{isClosed ? "Reopen" : "Close"}</span>
      </button>
    </div>
  );
}
