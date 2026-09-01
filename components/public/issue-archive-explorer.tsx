"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TOCDownloadMenu } from "@/components/editorial/toc-download-menu";

export type ArchiveArticle = {
  id: string;
  title: string;
  slug: string;
  abstract: string | null;
  doi: string | null;
  pageStart: string | null;
  pageEnd: string | null;
  issueOrder: number | null;
  coverImageUrl: string | null;
  publishedAt: Date | string | null;
  authors: Array<{
    id?: string;
    fullName: string;
    position?: number;
  }>;
  issue: {
    id: string;
    number: number;
    isClosed: boolean;
    volume: {
      id?: string;
      number: number;
      year: number;
      journal: {
        name: string;
        slug: string;
        shortName: string | null;
        department: { name: string } | null;
      };
    };
  };
};

export type ArchiveIssueGroup = {
  issue: ArchiveArticle["issue"];
  coverImageUrl: string | null;
  articles: ArchiveArticle[];
};

export function IssueArchiveExplorer({
  issueGroups,
}: {
  issueGroups: ArchiveIssueGroup[];
}) {
  const [activeIssue, setActiveIssue] = useState<ArchiveIssueGroup | null>(
    null,
  );
  const [activePdfArticle, setActivePdfArticle] =
    useState<ArchiveArticle | null>(null);

  // Keyboard accessibility: Escape to close active modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (activePdfArticle) {
          setActivePdfArticle(null);
        } else if (activeIssue) {
          setActiveIssue(null);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePdfArticle, activeIssue]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (activeIssue || activePdfArticle) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeIssue, activePdfArticle]);

  return (
    <>
      {/* View 1: Periodicals Shelf Grid */}
      <div className="space-y-8">
        <div className="flex items-center justify-between font-mono text-xs text-[color:var(--color-subtle)]">
          <span>
            Showing{" "}
            <strong className="text-[color:var(--color-accent)]">
              {issueGroups.length}
            </strong>{" "}
            {issueGroups.length === 1
              ? "issue collection"
              : "issue collections"}
          </span>
          <span className="hidden sm:inline">
            Click any issue to inspect its Table of Contents & Papers
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {issueGroups.map((group) => {
            const { issue, coverImageUrl, articles } = group;
            const journal = issue.volume.journal;
            const journalLabel = journal.department?.name ?? journal.name;

            return (
              <div
                key={issue.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--color-accent)] hover:shadow-xl hover:shadow-[color:var(--color-accent)]/5"
              >
                {/* Card Top: Cover / Emblem Visual */}
                <div
                  onClick={() => setActiveIssue(group)}
                  className="relative flex h-52 w-full cursor-pointer items-center justify-center overflow-hidden border-b border-[color:var(--color-border)] bg-gradient-to-br from-[#060c0b] to-[#122420] p-4 select-none"
                >
                  {coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverImageUrl}
                      alt={`${journal.name} Vol. ${issue.volume.number} Issue ${issue.number}`}
                      className="max-h-44 w-auto object-contain shadow-lg transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 text-center">
                      <div className="grid size-14 place-items-center rounded-2xl border border-[color:var(--color-accent)]/40 bg-[color:var(--color-surface)] font-serif text-xl font-bold text-[color:var(--color-accent)] shadow-md">
                        {journal.shortName || "FJ"}
                      </div>
                      <p className="font-serif text-sm font-semibold text-[color:var(--color-foreground)]">
                        {journal.name}
                      </p>
                      <span className="font-mono text-[10px] text-[color:var(--color-subtle)] uppercase">
                        Academic Periodical
                      </span>
                    </div>
                  )}

                  {/* Top Status Pill */}
                  <div className="absolute top-3 right-3">
                    {issue.isClosed ? (
                      <span className="rounded-full border border-slate-600/40 bg-slate-800/80 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-slate-300 backdrop-blur-md">
                        ARCHIVED
                      </span>
                    ) : (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300 backdrop-blur-md">
                        CURRENT ISSUE
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content & Details */}
                <div className="flex flex-1 flex-col justify-between space-y-4 p-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-[color:var(--color-accent)] uppercase">
                      <span>{journalLabel}</span>
                    </div>

                    <h3
                      onClick={() => setActiveIssue(group)}
                      className="cursor-pointer font-serif text-lg font-bold text-[color:var(--color-foreground)] transition-colors hover:text-[color:var(--color-accent)]"
                    >
                      Vol. {issue.volume.number}, Issue {issue.number} (
                      {issue.volume.year})
                    </h3>

                    <p className="line-clamp-2 text-xs text-[color:var(--color-muted)]">
                      {journal.name} — Official Faculty of Social Sciences
                      publishing edition.
                    </p>
                  </div>

                  {/* Card Bottom Meta & Actions */}
                  <div className="space-y-3 border-t border-[color:var(--color-border)]/60 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="rounded-md bg-[color:var(--color-surface)] px-2.5 py-1 font-mono text-[11px] font-medium text-[color:var(--color-foreground)]">
                        📄 {articles.length}{" "}
                        {articles.length === 1 ? "Paper" : "Papers"}
                      </span>
                      <TOCDownloadMenu issueId={issue.id} />
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveIssue(group)}
                      className="button-primary w-full justify-center py-2.5 text-xs font-semibold shadow-md transition hover:scale-[1.01]"
                    >
                      <span>Explore Issue & Table of Contents</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View 2: Instant Issue Table of Contents Modal */}
      {activeIssue ? (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm duration-200 sm:p-6">
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5 sm:p-6">
              <div className="flex items-center gap-4">
                {activeIssue.coverImageUrl ? (
                  <div className="hidden size-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-black/50 p-1 sm:flex">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeIssue.coverImageUrl}
                      alt={activeIssue.issue.volume.journal.name}
                      className="max-h-14 w-auto object-contain"
                    />
                  </div>
                ) : null}

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-bold text-[color:var(--color-accent)] uppercase">
                    <span>
                      {activeIssue.issue.volume.journal.department?.name ??
                        activeIssue.issue.volume.journal.name}
                    </span>
                    <span>·</span>
                    <span>
                      Vol. {activeIssue.issue.volume.number}, Issue{" "}
                      {activeIssue.issue.number} (
                      {activeIssue.issue.volume.year})
                    </span>
                    {activeIssue.issue.isClosed ? (
                      <span className="rounded bg-slate-500/20 px-2 py-0.5 text-[10px] text-slate-300">
                        CLOSED
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                        CURRENT / OPEN
                      </span>
                    )}
                  </div>

                  <h2 className="font-serif text-xl font-bold text-[color:var(--color-foreground)] sm:text-2xl">
                    {activeIssue.issue.volume.journal.name}
                  </h2>
                  <p className="text-xs text-[color:var(--color-muted)]">
                    Table of Contents — {activeIssue.articles.length}{" "}
                    {activeIssue.articles.length === 1 ? "article" : "articles"}{" "}
                    in this edition
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TOCDownloadMenu issueId={activeIssue.issue.id} />
                <button
                  type="button"
                  onClick={() => setActiveIssue(null)}
                  className="grid size-8 place-items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-surface-strong)] hover:text-[color:var(--color-foreground)]"
                  aria-label="Close Table of Contents modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable Table of Contents List */}
            <div className="flex-1 space-y-4 divide-y divide-[color:var(--color-border)]/70 overflow-y-auto p-5 sm:p-6">
              {activeIssue.articles.map((article, index) => (
                <div
                  key={article.id}
                  className="grid gap-4 pt-4 first:pt-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start"
                >
                  {/* Order Tag */}
                  <div className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[color:var(--color-accent)]/30 bg-[color:var(--color-surface-raised)] font-mono text-xs font-bold text-[color:var(--color-accent)]">
                    #{String(article.issueOrder ?? index + 1).padStart(2, "0")}
                  </div>

                  {/* Manuscript Info */}
                  <div className="min-w-0 space-y-1.5">
                    <h4 className="font-serif text-base leading-snug font-bold text-[color:var(--color-foreground)] sm:text-lg">
                      <Link
                        href={`/articles/${article.slug}`}
                        className="transition-colors hover:text-[color:var(--color-accent)] hover:underline"
                      >
                        {article.title}
                      </Link>
                    </h4>

                    {article.authors.length ? (
                      <p className="font-mono text-xs text-[color:var(--color-subtle)]">
                        Authors:{" "}
                        {article.authors.map((a) => a.fullName).join(", ")}
                      </p>
                    ) : null}

                    {article.doi ? (
                      <p className="font-mono text-[11px] text-[color:var(--color-accent)]">
                        DOI: https://doi.org/{article.doi}
                      </p>
                    ) : null}

                    {article.abstract ? (
                      <p className="line-clamp-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                        {article.abstract}
                      </p>
                    ) : null}
                  </div>

                  {/* Actions & Pagination */}
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    {article.pageStart ? (
                      <span className="font-mono text-xs font-semibold text-[color:var(--color-foreground)]">
                        pp. {article.pageStart}
                        {article.pageEnd ? `–${article.pageEnd}` : ""}
                      </span>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActivePdfArticle(article)}
                        className="button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold shadow-xs"
                      >
                        <span>👁️ Quick Read PDF</span>
                      </button>

                      <a
                        href={`/api/articles/${article.slug}/pdf`}
                        download
                        className="button-secondary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold"
                        title="Download PDF Document"
                      >
                        <span>📥 PDF</span>
                      </a>

                      <Link
                        href={`/articles/${article.slug}`}
                        className="button-secondary inline-flex items-center px-2.5 py-1.5 text-xs font-semibold"
                        title="View Full Page"
                      >
                        <span>🔗 Full</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-6 py-3.5 text-xs text-[color:var(--color-muted)]">
              <span>Press Escape or click outside to dismiss</span>
              <button
                type="button"
                onClick={() => setActiveIssue(null)}
                className="button-secondary px-3 py-1 text-xs font-semibold"
              >
                Close Table of Contents
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* View 3: In-Page Full PDF Reader Viewer Modal */}
      {activePdfArticle ? (
        <div className="animate-in fade-in fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-2 backdrop-blur-md duration-200 sm:p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] shadow-2xl"
          >
            {/* Viewer Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-5 py-3">
              <div className="max-w-xl min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 font-mono text-[10px] text-[color:var(--color-accent)] uppercase">
                  <span>In-Page Document Reader</span>
                  {activePdfArticle.doi ? (
                    <>
                      <span>·</span>
                      <span>DOI: {activePdfArticle.doi}</span>
                    </>
                  ) : null}
                </div>
                <h3 className="truncate font-serif text-sm font-bold text-[color:var(--color-foreground)] sm:text-base">
                  {activePdfArticle.title}
                </h3>
              </div>

              {/* Viewer Actions */}
              <div className="flex items-center gap-2">
                <a
                  href={`/api/articles/${activePdfArticle.slug}/pdf`}
                  download
                  className="button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                >
                  <span>📥 Download File</span>
                </a>

                <a
                  href={`/api/articles/${activePdfArticle.slug}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="button-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
                >
                  <span>↗ New Window</span>
                </a>

                <button
                  type="button"
                  onClick={() => setActivePdfArticle(null)}
                  className="button-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
                >
                  <span>✕ Close Viewer</span>
                </button>
              </div>
            </div>

            {/* Embedded Native PDF Viewer Frame */}
            <div className="relative flex-1 bg-neutral-900">
              <iframe
                src={`/api/articles/${activePdfArticle.slug}/pdf`}
                className="size-full border-0 bg-white"
                title={activePdfArticle.title}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
