"use client";

import { useMemo, useState } from "react";
import { AdminIssueRowActions } from "./actions-client";

export type CompactIssueData = {
  id: string;
  number: number;
  title: string | null;
  isClosed: boolean;
  publishedArticleCount: number;
  volume: {
    number: number;
    year: number;
    journal: {
      id: string;
      name: string;
      slug: string;
      departmentName: string | null;
    };
  };
};

export function CompactTOCExplorer({ issues }: { issues: CompactIssueData[] }) {
  // Extract distinct journals
  const journals = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; slug: string; label: string }
    >();
    for (const iss of issues) {
      const j = iss.volume.journal;
      if (!map.has(j.slug)) {
        map.set(j.slug, {
          id: j.id,
          name: j.name,
          slug: j.slug,
          label: j.departmentName || j.name.replace(/\s*\(.*\)/, ""),
        });
      }
    }
    return Array.from(map.values());
  }, [issues]);

  const [selectedJournalSlug, setSelectedJournalSlug] = useState<string>("all");

  const filteredIssues = useMemo(() => {
    if (selectedJournalSlug === "all") return issues;
    return issues.filter(
      (iss) => iss.volume.journal.slug === selectedJournalSlug,
    );
  }, [issues, selectedJournalSlug]);

  const [selectedIssueId, setSelectedIssueId] = useState<string>(
    issues[0]?.id || "",
  );

  // Ensure selected issue is within filtered list or default to first
  const currentIssue = useMemo(() => {
    const found = filteredIssues.find((i) => i.id === selectedIssueId);
    if (found) return found;
    return filteredIssues[0] || null;
  }, [filteredIssues, selectedIssueId]);

  if (issues.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
        <div className="p-6 text-center">
          <p className="text-xs text-[color:var(--color-muted)]">
            No journal issues created yet. Published articles will automatically
            populate issues here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[color:var(--color-foreground)]">
              Journal Issues &amp; Table of Contents
            </h2>
            <span className="rounded-full bg-[color:var(--color-surface)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-muted)]">
              {issues.length} {issues.length === 1 ? "issue" : "issues"}
            </span>
          </div>
          <p className="text-xs text-[color:var(--color-muted)]">
            Select an issue to manage publication status, update the Table of
            Contents, or download TOC documents.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* Journal Filter Pills if multiple journals exist */}
        {journals.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold text-[color:var(--color-muted)]">
              Journal:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedJournalSlug("all");
              }}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                selectedJournalSlug === "all"
                  ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
                  : "bg-[color:var(--color-surface)] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              }`}
            >
              All ({issues.length})
            </button>
            {journals.map((j) => {
              const count = issues.filter(
                (i) => i.volume.journal.slug === j.slug,
              ).length;
              return (
                <button
                  key={j.slug}
                  type="button"
                  onClick={() => {
                    setSelectedJournalSlug(j.slug);
                    const firstInJournal = issues.find(
                      (i) => i.volume.journal.slug === j.slug,
                    );
                    if (firstInJournal) setSelectedIssueId(firstInJournal.id);
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    selectedJournalSlug === j.slug
                      ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
                      : "bg-[color:var(--color-surface)] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                  }`}
                >
                  {j.label} ({count})
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Volume & Issue Dropdown Selector */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-xs font-semibold whitespace-nowrap text-[color:var(--color-foreground)]">
            Select Issue:
          </label>
          <select
            value={currentIssue?.id || ""}
            onChange={(e) => setSelectedIssueId(e.target.value)}
            className="app-field flex-1 text-xs font-medium"
          >
            {filteredIssues.map((iss) => {
              const journal = iss.volume.journal;
              const journalLabel = journal.departmentName || journal.name;
              const issueTitle =
                iss.title ||
                `Vol. ${iss.volume.number} No. ${iss.number} (${iss.volume.year})`;
              return (
                <option key={iss.id} value={iss.id}>
                  {journalLabel} — {issueTitle} ({iss.publishedArticleCount}{" "}
                  {iss.publishedArticleCount === 1 ? "article" : "articles"}){" "}
                  {iss.isClosed ? "[CLOSED]" : "[OPEN]"}
                </option>
              );
            })}
          </select>
        </div>

        {/* Selected Issue Detail Card */}
        {currentIssue ? (
          <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[color:var(--color-accent)] uppercase">
                  <span>
                    {currentIssue.volume.journal.departmentName ||
                      currentIssue.volume.journal.name}
                  </span>
                  <span>·</span>
                  <span>
                    Vol. {currentIssue.volume.number} · Issue{" "}
                    {currentIssue.number} ({currentIssue.volume.year})
                  </span>
                  <span>
                    {currentIssue.isClosed ? (
                      <span className="rounded bg-slate-500/20 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        CLOSED
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        OPEN
                      </span>
                    )}
                  </span>
                </div>

                <p className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                  {currentIssue.title ||
                    `Vol. ${currentIssue.volume.number} No. ${currentIssue.number} (${currentIssue.volume.year})`}
                </p>

                <p className="text-xs text-[color:var(--color-subtle)]">
                  <span className="font-semibold text-[color:var(--color-foreground)]">
                    {currentIssue.publishedArticleCount}
                  </span>{" "}
                  {currentIssue.publishedArticleCount === 1
                    ? "article"
                    : "articles"}{" "}
                  published in this issue
                </p>
              </div>

              <div className="shrink-0 pt-2 sm:pt-0">
                <AdminIssueRowActions
                  issueId={currentIssue.id}
                  isClosed={currentIssue.isClosed}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
