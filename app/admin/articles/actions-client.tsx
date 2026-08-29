"use client";

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
  isPublished,
}: {
  articleId: string;
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
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={handleToggle}
        className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
      >
        {isPublished ? "Unpublish" : "Publish"}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={handleDelete}
        className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
      >
        Delete
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
        <span className="animate-fade-in rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
          ✓ {statusMessage}
        </span>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={handlePublishTOC}
        className="rounded-[var(--radius-md)] border border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-accent)] transition hover:opacity-90 disabled:opacity-50"
      >
        Publish / Update TOC
      </button>

      <div className="flex items-center gap-1.5">
        <a
          href="/current-issue"
          target="_blank"
          className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
        >
          Preview
        </a>

        <a
          href={`/api/issues/${issueId}/toc?format=pdf`}
          download
          className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
        >
          PDF
        </a>

        <a
          href={`/api/issues/${issueId}/toc?format=html`}
          download
          className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--color-muted)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
        >
          HTML
        </a>

        <button
          type="button"
          disabled={pending}
          onClick={handleToggleClose}
          className={`rounded-[var(--radius-md)] border px-2.5 py-1.5 text-xs font-medium transition ${
            isClosed
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              : "border-slate-500/30 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20"
          }`}
        >
          {isClosed ? "Reopen" : "Close"}
        </button>
      </div>
    </div>
  );
}
