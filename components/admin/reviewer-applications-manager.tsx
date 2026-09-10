"use client";

import { useState, useTransition } from "react";
import type {
  ReviewerApplication,
  ReviewerApplicationStatus,
} from "@/lib/editorial/reviewer-applications-store";
import {
  deleteReviewerAction,
  updateReviewerStatusAction,
} from "@/app/admin/reviewers/actions";
import { formatShortDate } from "@/lib/formatting/dates";

export function formatAcademicName(
  academicTitle?: string,
  fullName?: string,
): string {
  const trimmedTitle = (academicTitle || "").trim();
  const trimmedName = (fullName || "").trim();
  if (!trimmedName) return "";
  if (!trimmedTitle) return trimmedName;

  const cleanTitle = trimmedTitle.replace(/\./g, "").toLowerCase();
  const firstWord = trimmedName.split(" ")[0].replace(/\./g, "").toLowerCase();

  if (
    firstWord === cleanTitle ||
    trimmedName.toLowerCase().startsWith(trimmedTitle.toLowerCase())
  ) {
    return trimmedName;
  }

  return `${trimmedTitle} ${trimmedName}`;
}

export function ReviewerApplicationsManager({
  initialApplications,
}: {
  initialApplications: ReviewerApplication[];
}) {
  const [applications, setApplications] =
    useState<ReviewerApplication[]>(initialApplications);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | ReviewerApplicationStatus
  >("ALL");
  const [journalFilter, setJournalFilter] = useState<string>("ALL");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleStatusChange = (
    applicationId: string,
    newStatus: ReviewerApplicationStatus,
  ) => {
    const prevApplications = [...applications];
    const formData = new FormData();
    formData.set("applicationId", applicationId);
    formData.set("status", newStatus);

    // Instant optimistic update
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId ? { ...app, status: newStatus } : app,
      ),
    );
    setPendingActionId(applicationId);

    startTransition(async () => {
      const res = await updateReviewerStatusAction({}, formData);
      setPendingActionId(null);
      if (res.success) {
        setFeedback({
          type: "success",
          message:
            newStatus === "APPROVED"
              ? "Reviewer approved and Editor workspace permissions assigned."
              : `Application marked as ${newStatus}.`,
        });
      } else {
        // Rollback on error
        setApplications(prevApplications);
        setFeedback({
          type: "error",
          message: res.error || "Failed to update status.",
        });
      }
    });
  };

  const handleDelete = (applicationId: string) => {
    if (
      !confirm("Are you sure you want to permanently delete this application?")
    ) {
      return;
    }

    const prevApplications = [...applications];
    const formData = new FormData();
    formData.set("applicationId", applicationId);

    // Instant optimistic update
    setApplications((prev) => prev.filter((app) => app.id !== applicationId));
    setPendingActionId(applicationId);

    startTransition(async () => {
      const res = await deleteReviewerAction({}, formData);
      setPendingActionId(null);
      if (res.success) {
        setFeedback({
          type: "success",
          message: "Application deleted successfully.",
        });
      } else {
        // Rollback on error
        setApplications(prevApplications);
        setFeedback({
          type: "error",
          message: res.error || "Failed to delete application.",
        });
      }
    });
  };

  const filtered = applications.filter((app) => {
    if (statusFilter !== "ALL" && app.status !== statusFilter) return false;
    if (journalFilter !== "ALL" && app.targetJournal !== journalFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold text-[color:var(--color-accent)] uppercase">
            Editorial Recruitment
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-[color:var(--color-foreground)]">
            Reviewer &amp; Referee Applications
          </h1>
          <p className="mt-0.5 text-xs text-[color:var(--color-muted)]">
            Review academic referee applicants, evaluate domain specializations,
            and approve peer reviewers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/apply-reviewer"
            target="_blank"
            rel="noopener noreferrer"
            className="button-secondary text-xs"
          >
            Public Application Form ↗
          </a>
        </div>
      </div>

      {feedback ? (
        <div
          className={`flex items-center justify-between rounded-[var(--radius-md)] p-3 text-xs font-semibold ${
            feedback.type === "success"
              ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
              : "border border-red-500/30 bg-red-500/15 text-red-400"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[10px] uppercase underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--color-border)] pb-4">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {(["ALL", "PENDING", "APPROVED", "DECLINED"] as const).map((s) => {
            const count =
              s === "ALL"
                ? applications.length
                : applications.filter((a) => a.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  statusFilter === s
                    ? "bg-[color:var(--color-accent)] text-black"
                    : "border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                }`}
              >
                {s} ({count})
              </button>
            );
          })}
        </div>

        {/* Journal Filter Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-[color:var(--color-subtle)]">
            Journal:
          </span>
          <select
            value={journalFilter}
            onChange={(e) => setJournalFilter(e.target.value)}
            className="app-field py-1 text-xs"
          >
            <option value="ALL">All Journals</option>
            <option value="njcp">NJCP (Psychology)</option>
            <option value="ajsbs">AJSBS</option>
            <option value="njsr">NJSR</option>
            <option value="gjcsr">GJCSR</option>
          </select>
        </div>
      </div>

      {/* Compact Directory List (matching Editorial Board Manager) */}
      <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 sm:p-5">
        <div className="flex flex-col gap-2 border-b border-[color:var(--color-border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
              Applications Directory
            </h2>
            <p className="font-mono text-xs text-[color:var(--color-accent)]">
              {filtered.length}{" "}
              {statusFilter === "ALL" ? "Total" : statusFilter} Application
              {filtered.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-[color:var(--color-muted)]">
              {statusFilter === "ALL"
                ? "No applications submitted yet. Direct prospective referees to the public /apply-reviewer page."
                : `No applications match the current filter (${statusFilter}).`}
            </p>
          ) : (
            filtered.map((app) => {
              const isActing = pendingActionId === app.id;
              const isExpanded = expandedIds.has(app.id);
              const hasExtraDetails = Boolean(app.statement || app.profileUrl);

              return (
                <div
                  key={app.id}
                  className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-3.5 transition hover:border-[color:var(--color-accent)]/50 sm:p-4"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    {/* Left Side: Metadata & Applicant Info */}
                    <div className="space-y-1">
                      {/* Meta Tag Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                            app.status === "APPROVED"
                              ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                              : app.status === "DECLINED"
                                ? "border border-zinc-500/30 bg-zinc-500/15 text-zinc-400"
                                : "border border-amber-500/30 bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {app.status}
                        </span>
                        <span className="rounded bg-[color:var(--color-surface-strong)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[color:var(--color-accent)] uppercase">
                          {app.targetJournal === "ALL"
                            ? "ALL JOURNALS"
                            : app.targetJournal.toUpperCase()}
                        </span>
                        <span className="font-mono text-[11px] text-[color:var(--color-subtle)]">
                          {app.trackingCode}
                        </span>
                        <span
                          suppressHydrationWarning
                          className="font-mono text-[11px] text-[color:var(--color-subtle)]"
                        >
                          · {formatShortDate(app.submittedAt)}
                        </span>
                      </div>

                      {/* Applicant Name */}
                      <h3 className="mt-1 font-serif text-base font-semibold text-[color:var(--color-foreground)]">
                        {formatAcademicName(app.academicTitle, app.fullName)}
                      </h3>

                      {/* Academic Subtitle */}
                      <p className="text-xs text-[color:var(--color-muted)]">
                        {app.academicRank} — {app.affiliation}
                      </p>

                      {/* Contact & Specialization Line */}
                      <p className="text-[11px] text-[color:var(--color-subtle)]">
                        <a
                          href={`mailto:${app.email}`}
                          className="text-[color:var(--color-accent)] hover:underline"
                        >
                          {app.email}
                        </a>
                        {app.phone ? ` · ${app.phone}` : ""} · Specialization:{" "}
                        <span className="font-medium text-[color:var(--color-foreground)]">
                          {app.specializationKeywords}
                        </span>
                      </p>
                    </div>

                    {/* Right Side: Action Controls */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      {hasExtraDetails ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(app.id)}
                          className="rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] px-2.5 py-1 text-xs font-semibold text-[color:var(--color-accent)] transition hover:border-[color:var(--color-accent)]"
                        >
                          {isExpanded ? "Hide Details ↑" : "Details →"}
                        </button>
                      ) : null}

                      {app.status !== "APPROVED" ? (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleStatusChange(app.id, "APPROVED")}
                          className="button-primary px-3 py-1 text-xs font-semibold"
                        >
                          {isActing ? "…" : "✓ Approve"}
                        </button>
                      ) : null}

                      {app.status !== "DECLINED" ? (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleStatusChange(app.id, "DECLINED")}
                          className="button-secondary px-3 py-1 text-xs"
                        >
                          Decline
                        </button>
                      ) : null}

                      {app.status !== "PENDING" ? (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleStatusChange(app.id, "PENDING")}
                          className="button-secondary px-3 py-1 text-xs text-[color:var(--color-subtle)]"
                        >
                          Reset
                        </button>
                      ) : null}

                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => handleDelete(app.id)}
                        className="rounded-[var(--radius-sm)] border border-red-500/30 px-2.5 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
                      >
                        🗑 Remove
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Details Drawer */}
                  {isExpanded && hasExtraDetails ? (
                    <div className="mt-3 space-y-2 border-t border-[color:var(--color-border)] pt-3 text-xs">
                      {app.profileUrl ? (
                        <div>
                          <span className="font-mono text-[11px] text-[color:var(--color-subtle)]">
                            Academic Profile / ORCID:
                          </span>{" "}
                          <a
                            href={app.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-[color:var(--color-accent)] hover:underline"
                          >
                            {app.profileUrl} ↗
                          </a>
                        </div>
                      ) : null}
                      {app.statement ? (
                        <div>
                          <span className="font-mono text-[11px] text-[color:var(--color-subtle)]">
                            Motivation Statement:
                          </span>
                          <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--color-muted)] italic">
                            &ldquo;{app.statement}&rdquo;
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
