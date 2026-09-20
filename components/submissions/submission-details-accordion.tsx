"use client";

import { useState } from "react";

export type AccordionAuthor = {
  id: string;
  position: number;
  fullName: string;
  email?: string | null;
  affiliation?: string | null;
  orcid?: string | null;
  isCorrespondingAuthor: boolean;
};

export type AccordionFile = {
  id: string;
  originalFileName: string;
  type: string;
  downloadUrl: string;
};

export type AccordionVersion = {
  id: string;
  versionNumber: number;
  label?: string;
  createdAt: string;
  originalFileName: string;
  downloadUrl?: string;
};

export function SubmissionDetailsAccordion({
  abstract,
  keywords,
  authors,
  files,
  versions,
  submittingAccount,
  defaultOpen = false,
}: {
  abstract?: string | null;
  keywords?: string[];
  authors: AccordionAuthor[];
  files: AccordionFile[];
  versions?: AccordionVersion[];
  submittingAccount?: {
    displayName: string;
    institution?: string | null;
  };
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden rounded-[var(--radius-lg)] bg-[color:var(--color-surface-raised)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-left transition hover:bg-[color:var(--color-surface-strong)]"
      >
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--color-foreground)]">
            Manuscript & author details
          </h2>
          <p className="mt-1 text-xs text-[color:var(--color-muted)]">
            {abstract
              ? "Abstract, authors, keywords, and files"
              : "Authors, keywords, and files"}
          </p>
        </div>
        <span className="text-xs text-[color:var(--color-subtle)]">
          {open ? "Hide details ↑" : "View details ↓"}
        </span>
      </button>

      {open ? (
        <div className="space-y-6 border-t border-[color:var(--color-border)] p-5">
          {abstract ? (
            <div>
              <h3 className="text-xs font-semibold tracking-wider text-[color:var(--color-subtle)] uppercase">
                Abstract
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-foreground)]">
                {abstract}
              </p>
            </div>
          ) : null}

          {keywords?.length ? (
            <div>
              <h3 className="text-xs font-semibold tracking-wider text-[color:var(--color-subtle)] uppercase">
                Keywords
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-md bg-[color:var(--color-surface)] px-2.5 py-1 text-xs text-[color:var(--color-foreground)]"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {submittingAccount ? (
            <div>
              <h3 className="text-xs font-semibold tracking-wider text-[color:var(--color-subtle)] uppercase">
                Submitting user
              </h3>
              <p className="mt-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                {submittingAccount.displayName}
              </p>
              {submittingAccount.institution ? (
                <p className="mt-0.5 text-xs text-[color:var(--color-subtle)]">
                  {submittingAccount.institution}
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[color:var(--color-subtle)] uppercase">
              Authors
            </h3>
            {authors.length ? (
              <div className="mt-3 space-y-2">
                {authors.map((author) => (
                  <div
                    key={author.id}
                    className="rounded-[var(--radius-md)] bg-[color:var(--color-surface)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                        {author.fullName}
                      </p>
                      {author.isCorrespondingAuthor ? (
                        <span className="rounded bg-[color:var(--color-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-accent)]">
                          Corresponding author
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                      {[author.email, author.affiliation, author.orcid]
                        .filter(Boolean)
                        .join(" · ") || "Affiliation not provided"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--color-subtle)]">
                No authors added yet.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[color:var(--color-subtle)] uppercase">
              Files & versions
            </h3>
            {versions?.length ? (
              <div className="mt-3 space-y-2">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] bg-[color:var(--color-surface)] p-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[color:var(--color-foreground)]">
                        Version {ver.versionNumber}{" "}
                        {ver.label ? `· ${ver.label}` : ""}
                      </p>
                      <p className="mt-0.5 truncate text-[color:var(--color-subtle)]">
                        {ver.createdAt} · {ver.originalFileName}
                      </p>
                    </div>
                    {ver.downloadUrl ? (
                      <a
                        href={ver.downloadUrl}
                        title={`Download Version ${ver.versionNumber}`}
                        aria-label={`Download Version ${ver.versionNumber}`}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-muted)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="size-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 3a.75.75 0 0 1 .75.75v8.19l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72V3.75A.75.75 0 0 1 10 3ZM3.75 14.25a.75.75 0 0 1 .75.75v1.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 15.25 18H4.75A1.75 1.75 0 0 1 3 16.25v-1.5a.75.75 0 0 1 .75-.75Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </a>
                    ) : null}
                  </div>
                ))}
                {files
                  .filter((f) => f.type && f.type !== "MANUSCRIPT")
                  .map((file) => (
                    <a
                      key={file.id}
                      href={file.downloadUrl}
                      title={`Download ${file.originalFileName}`}
                      aria-label={`Download ${file.originalFileName}`}
                      className="group flex items-center justify-between gap-4 rounded-[var(--radius-md)] bg-[color:var(--color-surface)] p-3 text-sm font-semibold transition hover:bg-[color:var(--color-surface-strong)] hover:text-[color:var(--color-accent)]"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="text-base text-[color:var(--color-subtle)] group-hover:text-[color:var(--color-accent)]">
                          📄
                        </span>
                        <span className="truncate">
                          {file.originalFileName}
                        </span>
                      </div>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-muted)] transition group-hover:border-[color:var(--color-accent)] group-hover:text-[color:var(--color-accent)]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="size-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 3a.75.75 0 0 1 .75.75v8.19l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72V3.75A.75.75 0 0 1 10 3ZM3.75 14.25a.75.75 0 0 1 .75.75v1.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 15.25 18H4.75A1.75 1.75 0 0 1 3 16.25v-1.5a.75.75 0 0 1 .75-.75Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    </a>
                  ))}
              </div>
            ) : files.length ? (
              <div className="mt-3 space-y-2">
                {files.map((file) => (
                  <a
                    key={file.id}
                    href={file.downloadUrl}
                    title={`Download ${file.originalFileName}`}
                    aria-label={`Download ${file.originalFileName}`}
                    className="group flex items-center justify-between gap-4 rounded-[var(--radius-md)] bg-[color:var(--color-surface)] p-3 text-sm font-semibold transition hover:bg-[color:var(--color-surface-strong)] hover:text-[color:var(--color-accent)]"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="text-base text-[color:var(--color-subtle)] group-hover:text-[color:var(--color-accent)]">
                        📄
                      </span>
                      <span className="truncate">{file.originalFileName}</span>
                    </div>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-muted)] transition group-hover:border-[color:var(--color-accent)] group-hover:text-[color:var(--color-accent)]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 3a.75.75 0 0 1 .75.75v8.19l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72V3.75A.75.75 0 0 1 10 3ZM3.75 14.25a.75.75 0 0 1 .75.75v1.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 15.25 18H4.75A1.75 1.75 0 0 1 3 16.25v-1.5a.75.75 0 0 1 .75-.75Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--color-subtle)]">
                No files uploaded yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
