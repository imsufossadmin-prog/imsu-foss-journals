"use client";

import { useActionState, useState } from "react";

import {
  createDirectLegacyArticleAction,
  type AdminArticleFormState,
} from "../actions";

type JournalOption = {
  id: string;
  slug: string;
  name: string;
  department?: { name: string } | null;
};

const initialState: AdminArticleFormState = {};

export function AdminLegacyUploadForm({
  journals,
}: {
  journals: JournalOption[];
}) {
  const [state, action, pending] = useActionState(
    createDirectLegacyArticleAction,
    initialState,
  );

  const [authors, setAuthors] = useState<
    Array<{
      fullName: string;
      affiliation: string;
      email: string;
      orcid: string;
    }>
  >([{ fullName: "", affiliation: "", email: "", orcid: "" }]);

  const addAuthor = () => {
    setAuthors([
      ...authors,
      { fullName: "", affiliation: "", email: "", orcid: "" },
    ]);
  };

  const removeAuthor = (index: number) => {
    if (authors.length <= 1) return;
    setAuthors(authors.filter((_, i) => i !== index));
  };

  const updateAuthor = (
    index: number,
    field: "fullName" | "affiliation" | "email" | "orcid",
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

  return (
    <form action={action} className="space-y-6">
      {state.error ? (
        <div className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-400">
          {state.error}
        </div>
      ) : null}

      {journals.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-semibold text-amber-300">
          No active journals found in database. Please ensure a journal is
          seeded and active before uploading legacy manuscripts.
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[color:var(--color-foreground)]">
          Target Journal *
          <select
            name="journalSlug"
            className="app-field mt-1.5"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Select Journal…
            </option>
            {journals.map((j) => (
              <option key={j.id} value={j.slug}>
                {j.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-[color:var(--color-foreground)]">
          Manuscript Title *
          <input
            name="title"
            type="text"
            placeholder="e.g. An Empirical Study on Social Behaviour"
            className="app-field mt-1.5"
            required
          />
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-4">
        <label className="text-xs font-semibold text-[color:var(--color-foreground)]">
          Volume Number *
          <input
            name="volume"
            type="number"
            min="1"
            defaultValue="1"
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
            defaultValue="1"
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
            defaultValue={new Date().getFullYear()}
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
            placeholder="e.g. 1"
            className="app-field mt-1.5"
          />
          <span className="mt-1 block text-[11px] font-normal text-[color:var(--color-muted)]">
            Leave blank for auto-order
          </span>
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <label className="text-xs font-semibold text-[color:var(--color-foreground)]">
          Publication Date (Optional / Backdate)
          <input name="publishedAt" type="date" className="app-field mt-1.5" />
          <span className="mt-1 block text-[11px] font-normal text-[color:var(--color-muted)]">
            Leave blank to use current date
          </span>
        </label>

        <label className="text-xs font-semibold text-[color:var(--color-foreground)]">
          Page Range (Optional)
          <input
            name="pageStart"
            type="text"
            placeholder="e.g. 15–28"
            className="app-field mt-1.5"
          />
        </label>

        <label className="text-xs font-semibold text-[color:var(--color-foreground)]">
          Digital Object Identifier - DOI (Optional)
          <input
            name="doi"
            type="text"
            placeholder="e.g. 10.4314/imsufoss.v1i1.1"
            className="app-field mt-1.5"
          />
        </label>
      </div>

      <input type="hidden" name="authorsJson" value={JSON.stringify(authors)} />

      {/* Authors Manager */}
      <div className="space-y-3 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[color:var(--color-foreground)]">
              Article Authors, Affiliations &amp; ORCID *
            </h3>
            <p className="text-[11px] text-[color:var(--color-muted)]">
              Add contributing authors in published order with optional
              affiliations and ORCID iDs.
            </p>
          </div>
          <button
            type="button"
            onClick={addAuthor}
            className="rounded-[var(--radius-md)] border border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--color-accent)] hover:opacity-90"
          >
            + Add Collaborating Author
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
                placeholder="Full Name (e.g. Prof. Jane Doe) *"
                className="app-field flex-1 text-xs"
                required
              />

              <input
                type="text"
                value={author.affiliation}
                onChange={(e) =>
                  updateAuthor(index, "affiliation", e.target.value)
                }
                placeholder="Affiliation (Department, University)"
                className="app-field flex-1 text-xs"
              />

              <input
                type="text"
                value={author.orcid}
                onChange={(e) => updateAuthor(index, "orcid", e.target.value)}
                placeholder="ORCID iD (0000-0000-0000-0000)"
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

      <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
        Abstract (Optional)
        <textarea
          name="abstract"
          rows={4}
          placeholder="Summary or abstract of the paper..."
          className="app-field mt-1.5"
        />
      </label>

      <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
        Keywords (Comma-separated)
        <input
          name="keywords"
          type="text"
          placeholder="e.g. Psychology, Behaviour, West Africa"
          className="app-field mt-1.5"
        />
      </label>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
          Upload Manuscript PDF (Required) *
          <input
            name="manuscriptPdf"
            type="file"
            accept=".pdf,application/pdf"
            className="app-field mt-1.5"
            required
          />
        </label>

        <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
          Upload Article Cover Image (Optional)
          <input
            name="coverImage"
            type="file"
            accept="image/*"
            className="app-field mt-1.5"
          />
        </label>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] pt-6">
        <button
          type="submit"
          disabled={pending}
          className="button-primary inline-flex items-center gap-2"
        >
          {pending ? (
            <span>Publishing Manuscript...</span>
          ) : (
            <span>Publish Manuscript to Archives</span>
          )}
        </button>
      </div>
    </form>
  );
}
