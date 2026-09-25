"use client";

import { useActionState, useRef, useState } from "react";
import { submitDirectArticleAction } from "@/app/author/submissions/actions";
import type {
  ActionState,
  SubmissionAuthorInput,
} from "@/lib/submissions/types";

type JournalOption = {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  department?: { name: string } | null;
};

const initialState: ActionState = {};

export function DirectArticleSubmissionForm({
  journals,
  defaultJournalSlug = "",
  initialAuthorName = "",
  initialAuthorEmail = "",
}: {
  journals: JournalOption[];
  defaultJournalSlug?: string;
  initialAuthorName?: string;
  initialAuthorEmail?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    submitDirectArticleAction,
    initialState,
  );

  const [selectedJournalSlug, setSelectedJournalSlug] = useState<string>(() => {
    if (
      defaultJournalSlug &&
      journals.some((j) => j.slug === defaultJournalSlug)
    ) {
      return defaultJournalSlug;
    }
    return journals[0]?.slug ?? "";
  });

  const [authors, setAuthors] = useState<SubmissionAuthorInput[]>([
    {
      fullName: initialAuthorName,
      email: initialAuthorEmail,
      affiliation: "",
      orcid: "",
      isCorrespondingAuthor: true,
    },
  ]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addAuthor = () => {
    setAuthors((prev) => [
      ...prev,
      {
        fullName: "",
        email: "",
        affiliation: "",
        orcid: "",
        isCorrespondingAuthor: false,
      },
    ]);
  };

  const removeAuthor = (index: number) => {
    setAuthors((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Ensure at least one corresponding author
      if (updated.length > 0 && !updated.some((a) => a.isCorrespondingAuthor)) {
        updated[0].isCorrespondingAuthor = true;
      }
      return updated;
    });
  };

  const updateAuthor = (
    index: number,
    field: keyof SubmissionAuthorInput,
    value: unknown,
  ) => {
    setAuthors((prev) =>
      prev.map((author, i) => {
        if (field === "isCorrespondingAuthor") {
          return {
            ...author,
            isCorrespondingAuthor: i === index ? Boolean(value) : false,
          };
        }
        if (i === index) {
          return { ...author, [field]: value };
        }
        return author;
      }),
    );
  };

  return (
    <form action={formAction} className="space-y-8">
      {state.error ? (
        <div
          className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-400"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      <input type="hidden" name="authors" value={JSON.stringify(authors)} />

      {/* Target Journal */}
      <section className="space-y-2">
        <label
          htmlFor="journalSlug"
          className="block text-xs font-bold tracking-wider text-[color:var(--color-foreground)] uppercase"
        >
          Target Academic Journal *
        </label>
        <select
          id="journalSlug"
          name="journalSlug"
          value={selectedJournalSlug}
          onChange={(e) => setSelectedJournalSlug(e.target.value)}
          className="app-field !w-full text-sm"
          required
        >
          {journals.map((j) => (
            <option key={j.id} value={j.slug}>
              {j.shortName && !j.name.includes(j.shortName)
                ? `${j.name} (${j.shortName})`
                : j.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-[color:var(--color-muted)]">
          Select the faculty or departmental journal best suited for your paper.
        </p>
      </section>

      {/* Article Title */}
      <section className="space-y-2">
        <label
          htmlFor="title"
          className="block text-xs font-bold tracking-wider text-[color:var(--color-foreground)] uppercase"
        >
          Manuscript Title *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="e.g. Cognitive Behavioral Interventions in Post-Primary Education"
          className="app-field !w-full text-sm font-medium"
          required
        />
      </section>

      {/* Authors Repeater */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold tracking-wider text-[color:var(--color-foreground)] uppercase">
              Contributing Authors *
            </h2>
            <p className="mt-0.5 text-[11px] text-[color:var(--color-muted)]">
              Specify all contributing authors in published order.
            </p>
          </div>
          <button
            type="button"
            onClick={addAuthor}
            className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
          >
            + Add Author
          </button>
        </div>

        <div className="space-y-3">
          {authors.map((author, index) => (
            <div
              key={index}
              className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3.5"
            >
              <div className="flex items-center justify-between pb-2.5">
                <span className="font-mono text-xs font-semibold text-[color:var(--color-accent)]">
                  Author {index + 1}
                </span>
                {authors.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeAuthor(index)}
                    className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-danger)]"
                  >
                    ✕ Remove
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-[color:var(--color-subtle)]">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={author.fullName}
                    onChange={(e) =>
                      updateAuthor(index, "fullName", e.target.value)
                    }
                    placeholder="e.g. Dr. Ngozi Okafor"
                    className="app-field mt-1 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[color:var(--color-subtle)]">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={author.email}
                    onChange={(e) =>
                      updateAuthor(index, "email", e.target.value)
                    }
                    placeholder="e.g. ngozi.okafor@imsu.edu.ng"
                    className="app-field mt-1 text-xs"
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Abstract */}
      <section className="space-y-2">
        <label
          htmlFor="abstract"
          className="block text-xs font-bold tracking-wider text-[color:var(--color-foreground)] uppercase"
        >
          Abstract *
        </label>
        <textarea
          id="abstract"
          name="abstract"
          rows={5}
          placeholder="Provide the abstract of your manuscript detailing background, methodology, results, and conclusion..."
          className="app-field !w-full text-xs leading-relaxed"
          required
        />
      </section>

      {/* Keywords */}
      <section className="space-y-2">
        <label
          htmlFor="keywords"
          className="block text-xs font-bold tracking-wider text-[color:var(--color-foreground)] uppercase"
        >
          Keywords *
        </label>
        <input
          id="keywords"
          name="keywords"
          type="text"
          placeholder="e.g. Clinical Psychology, Wellbeing, Academic Performance, Imo State"
          className="app-field !w-full text-xs"
          required
        />
        <p className="text-[11px] text-[color:var(--color-muted)]">
          Separate keywords with commas (up to 8 keywords).
        </p>
      </section>

      {/* Manuscript File Upload */}
      <section className="space-y-2">
        <label className="block text-xs font-bold tracking-wider text-[color:var(--color-foreground)] uppercase">
          Manuscript Document *
        </label>
        <div className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] p-4 text-center transition hover:border-[color:var(--color-accent)]">
          <input
            ref={fileInputRef}
            type="file"
            name="manuscriptFile"
            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            className="sr-only"
            required
            onChange={(e) => {
              const file = e.target.files?.[0];
              setSelectedFile(file || null);
            }}
          />

          {selectedFile ? (
            <div className="flex items-center justify-between gap-3 rounded-md bg-[color:var(--color-surface-raised)] p-3 text-left">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="text-xl">📄</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[color:var(--color-foreground)]">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-[color:var(--color-subtle)]">
                    {Math.round(selectedFile.size / 1024)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="shrink-0 text-xs font-semibold text-[color:var(--color-danger)] hover:underline"
              >
                ✕ Change
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2 sm:flex-row sm:justify-between sm:px-2">
              <div className="text-center sm:text-left">
                <p className="text-xs font-semibold text-[color:var(--color-foreground)]">
                  Upload Microsoft Word manuscript (.docx)
                </p>
                <p className="text-[11px] text-[color:var(--color-muted)]">
                  Accepted format: Microsoft Word (.docx). PDF is not accepted.
                  Max size 20 MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="button-secondary mt-2 text-xs sm:mt-0"
              >
                Browse Files
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Submission CTA */}
      <div className="border-t border-[color:var(--color-border)] pt-6">
        <p className="mb-4 text-xs leading-5 text-[color:var(--color-muted)]">
          By clicking &quot;Submit Manuscript&quot;, you confirm that this paper
          is your original scholarly work, has not been published elsewhere, and
          complies with IMSU FOSS ethical guidelines.
        </p>
        <button
          type="submit"
          disabled={isPending || !selectedFile}
          className="button-primary w-full justify-center py-3 text-sm font-semibold disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg
                className="size-4 animate-spin text-current"
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
              <span>Submitting Manuscript to Journal…</span>
            </span>
          ) : (
            "Submit Manuscript to Editorial Secretariat"
          )}
        </button>
      </div>
    </form>
  );
}
