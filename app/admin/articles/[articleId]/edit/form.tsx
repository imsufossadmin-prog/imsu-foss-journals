"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { updateArticleAction, type AdminArticleFormState } from "../../actions";

export type ArticleAuthorData = {
  id?: string;
  fullName: string;
  affiliation?: string | null;
  email?: string | null;
  position: number;
};

export type ArticleEditData = {
  id: string;
  title: string;
  abstract: string | null;
  keywords: string[];
  doi: string | null;
  pageStart: string | null;
  pageEnd: string | null;
  issueOrder: number | null;
  publishedAt: Date | null;
  coverImageUrl: string | null;
  issue: {
    number: number;
    volume: {
      number: number;
      year: number;
      journal: {
        name: string;
        slug: string;
        departmentName: string | null;
      };
    };
  };
  authors: ArticleAuthorData[];
  existingPdfFileName?: string | null;
};

const initialState: AdminArticleFormState = {};

export function AdminArticleEditForm({
  article,
}: {
  article: ArticleEditData;
}) {
  const [state, action, pending] = useActionState(
    updateArticleAction,
    initialState,
  );

  const [authors, setAuthors] = useState<
    Array<{ fullName: string; affiliation: string; email: string }>
  >(
    article.authors.length > 0
      ? article.authors.map((a) => ({
          fullName: a.fullName,
          affiliation: a.affiliation || "",
          email: a.email || "",
        }))
      : [{ fullName: "", affiliation: "", email: "" }],
  );

  const addAuthor = () => {
    setAuthors([...authors, { fullName: "", affiliation: "", email: "" }]);
  };

  const removeAuthor = (index: number) => {
    if (authors.length <= 1) return;
    setAuthors(authors.filter((_, i) => i !== index));
  };

  const updateAuthor = (
    index: number,
    field: "fullName" | "affiliation" | "email",
    value: string,
  ) => {
    const updated = [...authors];
    updated[index][field] = value;
    setAuthors(updated);
  };

  const moveAuthor = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === authors.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...authors];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setAuthors(updated);
  };

  const formattedDate = article.publishedAt
    ? new Date(article.publishedAt).toISOString().split("T")[0]
    : "";

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="articleId" value={article.id} />
      <input type="hidden" name="authorsJson" value={JSON.stringify(authors)} />

      {state.error ? (
        <div className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-400">
          {state.error}
        </div>
      ) : null}

      {/* Target Journal & Volume Summary Badge */}
      <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-xs">
        <span className="font-semibold text-[color:var(--color-muted)]">
          Target Journal:
        </span>{" "}
        <span className="font-bold text-[color:var(--color-foreground)]">
          {article.issue.volume.journal.departmentName ||
            article.issue.volume.journal.name}
        </span>
        <span className="mx-2 text-[color:var(--color-muted)]">·</span>
        <span className="text-[color:var(--color-muted)]">Slug:</span>{" "}
        <span className="font-mono text-[color:var(--color-accent)]">
          {article.issue.volume.journal.slug}
        </span>
      </div>

      {/* Title */}
      <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
        Manuscript Title *
        <input
          name="title"
          type="text"
          defaultValue={article.title}
          placeholder="e.g. An Empirical Study on Social Behaviour"
          className="app-field mt-1.5 w-full"
          required
        />
      </label>

      {/* Volume, Issue, Year, Issue Order */}
      <div className="grid gap-6 sm:grid-cols-4">
        <label className="text-xs font-semibold text-[color:var(--color-foreground)]">
          Volume Number *
          <input
            name="volume"
            type="number"
            min="1"
            defaultValue={article.issue.volume.number}
            className="app-field mt-1.5"
            required
          />
        </label>

        <label className="text-xs font-semibold text-[color:var(--color-foreground)]">
          Issue Number *
          <input
            name="issue"
            type="number"
            min="1"
            defaultValue={article.issue.number}
            className="app-field mt-1.5"
            required
          />
        </label>

        <label className="text-xs font-semibold text-[color:var(--color-foreground)]">
          Publication Year *
          <input
            name="year"
            type="number"
            min="1970"
            max="2100"
            defaultValue={article.issue.volume.year}
            className="app-field mt-1.5"
            required
          />
        </label>

        <label className="text-xs font-semibold text-[color:var(--color-foreground)]">
          TOC Order (Optional)
          <input
            name="issueOrder"
            type="number"
            min="1"
            defaultValue={article.issueOrder ?? ""}
            placeholder="e.g. 1"
            className="app-field mt-1.5"
          />
          <span className="mt-1 block text-[11px] font-normal text-[color:var(--color-muted)]">
            Leave blank for auto-order
          </span>
        </label>
      </div>

      {/* Date, Pages, DOI */}
      <div className="grid gap-6 sm:grid-cols-3">
        <label className="text-xs font-semibold text-[color:var(--color-foreground)]">
          Publication Date (Optional)
          <input
            name="publishedAt"
            type="date"
            defaultValue={formattedDate}
            className="app-field mt-1.5"
          />
          <span className="mt-1 block text-[11px] font-normal text-[color:var(--color-muted)]">
            Used for archive sorting
          </span>
        </label>

        <label className="text-xs font-semibold text-[color:var(--color-foreground)]">
          Page Range (Optional)
          <input
            name="pageStart"
            type="text"
            defaultValue={article.pageStart ?? ""}
            placeholder="e.g. 15–28"
            className="app-field mt-1.5"
          />
        </label>

        <label className="text-xs font-semibold text-[color:var(--color-foreground)]">
          DOI (Optional)
          <input
            name="doi"
            type="text"
            defaultValue={article.doi ?? ""}
            placeholder="e.g. 10.4314/imsufoss.v16i6.1"
            className="app-field mt-1.5"
          />
        </label>
      </div>

      {/* Authors Manager */}
      <div className="space-y-3 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[color:var(--color-foreground)]">
              Article Authors &amp; Affiliations *
            </h3>
            <p className="text-[11px] text-[color:var(--color-muted)]">
              Add, edit, and order the contributing authors.
            </p>
          </div>
          <button
            type="button"
            onClick={addAuthor}
            className="rounded-[var(--radius-md)] border border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--color-accent)] hover:opacity-90"
          >
            + Add Author
          </button>
        </div>

        <div className="space-y-2.5 pt-2">
          {authors.map((author, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-3 sm:flex-row sm:items-center"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-surface)] text-[11px] font-bold text-[color:var(--color-accent)]">
                {index + 1}
              </span>

              <input
                type="text"
                value={author.fullName}
                onChange={(e) =>
                  updateAuthor(index, "fullName", e.target.value)
                }
                placeholder="Full Name (e.g. Prof. Jane Doe)"
                className="app-field flex-1 text-xs"
                required
              />

              <input
                type="text"
                value={author.affiliation}
                onChange={(e) =>
                  updateAuthor(index, "affiliation", e.target.value)
                }
                placeholder="Affiliation / Department / Institution"
                className="app-field flex-1 text-xs"
              />

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveAuthor(index, "up")}
                  disabled={index === 0}
                  className="rounded p-1 text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)] disabled:opacity-30"
                  title="Move Up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveAuthor(index, "down")}
                  disabled={index === authors.length - 1}
                  className="rounded p-1 text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)] disabled:opacity-30"
                  title="Move Down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeAuthor(index)}
                  disabled={authors.length <= 1}
                  className="rounded p-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-30"
                  title="Remove Author"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Abstract */}
      <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
        Abstract (Optional)
        <textarea
          name="abstract"
          rows={5}
          defaultValue={article.abstract ?? ""}
          placeholder="Summary or abstract of the manuscript..."
          className="app-field mt-1.5"
        />
      </label>

      {/* Keywords */}
      <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
        Keywords (Comma-separated)
        <input
          name="keywords"
          type="text"
          defaultValue={article.keywords.join(", ")}
          placeholder="e.g. Psychology, Behaviour, Social Dynamics"
          className="app-field mt-1.5"
        />
      </label>

      {/* File Replacement Inputs */}
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
          Replace Manuscript PDF (Optional)
          <input
            name="manuscriptPdf"
            type="file"
            accept=".pdf,application/pdf"
            className="app-field mt-1.5"
          />
          <span className="mt-1 block text-[11px] font-normal text-[color:var(--color-muted)]">
            {article.existingPdfFileName
              ? `Current PDF: ${article.existingPdfFileName} (leave empty to keep)`
              : "Upload a replacement PDF file"}
          </span>
        </label>

        <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
          Replace Cover Image (Optional)
          <input
            name="coverImage"
            type="file"
            accept="image/*"
            className="app-field mt-1.5"
          />
          <span className="mt-1 block text-[11px] font-normal text-[color:var(--color-muted)]">
            {article.coverImageUrl
              ? "Current cover set. Upload new file to replace."
              : "Upload an optional cover image"}
          </span>
        </label>
      </div>

      {/* Submit / Cancel Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] pt-6">
        <Link
          href="/admin/articles"
          className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] px-4 py-2 text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="button-primary inline-flex items-center gap-2"
        >
          {pending ? (
            <span>Saving Changes...</span>
          ) : (
            <span>Save Article Changes</span>
          )}
        </button>
      </div>
    </form>
  );
}
