"use client";

import { useTransition } from "react";
import { deleteArticleAction, toggleArticlePublicationAction } from "./actions";

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
