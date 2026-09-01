"use client";

import { useActionState } from "react";

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
                {j.department?.name
                  ? `${j.name} (${j.department.name})`
                  : j.name}
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

      <label className="block text-xs font-semibold text-[color:var(--color-foreground)]">
        Author Names (Comma-separated) *
        <input
          name="authorNames"
          type="text"
          placeholder="e.g. Dr. John Doe, Prof. Jane Smith"
          className="app-field mt-1.5"
          required
        />
      </label>

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
