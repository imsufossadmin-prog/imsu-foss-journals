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
          <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
            {authors.length} author{authors.length === 1 ? "" : "s"} ·{" "}
            {files.length} file{files.length === 1 ? "" : "s"}
          </p>
        </div>
        <span className="flex size-7 items-center justify-center rounded-full bg-[color:var(--color-surface)] text-xs text-[color:var(--color-muted)]">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div className="space-y-6 p-5 pt-0">
          {abstract ? (
            <div>
              <h3 className="text-xs font-semibold tracking-wider text-[color:var(--color-subtle)] uppercase">
                Abstract
              </h3>
              <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
                {abstract}
              </p>
              {keywords?.length ? (
                <p className="mt-3 text-xs text-[color:var(--color-subtle)]">
                  <span className="font-semibold text-[color:var(--color-muted)]">
                    Keywords:
                  </span>{" "}
                  {keywords.join(" · ")}
                </p>
              ) : null}
            </div>
          ) : null}

          {submittingAccount ? (
            <div>
              <h3 className="text-xs font-semibold tracking-wider text-[color:var(--color-subtle)] uppercase">
                Submitting account
              </h3>
              <p className="mt-1 text-sm font-semibold text-[color:var(--color-foreground)]">
                {submittingAccount.displayName}
              </p>
              {submittingAccount.institution ? (
                <p className="text-xs text-[color:var(--color-subtle)]">
                  {submittingAccount.institution}
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[color:var(--color-subtle)] uppercase">
              Academic authors
            </h3>
            {authors.length ? (
              <div className="mt-3 space-y-2">
                {authors.map((author) => (
                  <div
                    key={author.id}
                    className="rounded-[var(--radius-md)] bg-[color:var(--color-surface)] p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">
                        {author.position}. {author.fullName}
                      </p>
                      {author.isCorrespondingAuthor ? (
                        <span className="rounded-full bg-[color:var(--color-accent)]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-accent)]">
                          Corresponding
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
            {files.length ? (
              <div className="mt-3 space-y-2">
                {files.map((file) => (
                  <a
                    key={file.id}
                    href={file.downloadUrl}
                    className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] bg-[color:var(--color-surface)] p-3 text-sm font-semibold transition hover:bg-[color:var(--color-surface-strong)] hover:text-[color:var(--color-accent)]"
                  >
                    <span className="truncate">{file.originalFileName}</span>
                    <span className="text-[10px] font-semibold text-[color:var(--color-subtle)] uppercase">
                      {file.type.replaceAll("_", " ")} · Download
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--color-subtle)]">
                No files uploaded yet.
              </p>
            )}

            {versions?.length ? (
              <div className="mt-3 space-y-2">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] bg-[color:var(--color-surface)] p-3 text-xs text-[color:var(--color-subtle)]"
                  >
                    <div>
                      <p className="font-semibold text-[color:var(--color-foreground)]">
                        Version {ver.versionNumber}{" "}
                        {ver.label ? `· ${ver.label}` : ""}
                      </p>
                      <p className="mt-0.5">
                        {ver.createdAt} · {ver.originalFileName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
