"use client";

import { useMemo, useState } from "react";
import { sortJournalsByCanonicalOrder } from "@/lib/editorial/editorial-board-data";
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
    return sortJournalsByCanonicalOrder(Array.from(map.values()));
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
    <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        {/* Title + Journal Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold tracking-wider text-[color:var(--color-foreground)] uppercase">
              Journal Issues &amp; Table of Contents
            </h2>
            <span className="rounded-full bg-[color:var(--color-surface)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-muted)]">
              {issues.length} {issues.length === 1 ? "issue" : "issues"}
            </span>
          </div>

          {/* Journal Filter Pills */}
          {journals.length > 1 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedJournalSlug("all")}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                  selectedJournalSlug === "all"
                    ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
                    : "bg-[color:var(--color-surface)] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                }`}
              >
                All ({issues.length})
              </button>
              {journals.map((j) => (
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
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                    selectedJournalSlug === j.slug
                      ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
                      : "bg-[color:var(--color-surface)] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                  }`}
                >
                  {j.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Single Inline Row: Issue Selector + Action Buttons */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <select
              value={currentIssue?.id || ""}
              onChange={(e) => setSelectedIssueId(e.target.value)}
              className="app-field max-w-xl truncate text-xs font-medium"
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

          {currentIssue ? (
            <div className="flex shrink-0 items-center gap-2">
              <AdminIssueRowActions
                issueId={currentIssue.id}
                isClosed={currentIssue.isClosed}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
