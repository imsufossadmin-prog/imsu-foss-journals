import type { Metadata } from "next";
import Link from "next/link";
import { ReviewerApplicationForm } from "@/components/public/reviewer-application-form";
import { requireApplicationArea } from "@/lib/auth/authorization";
import {
  formatAcademicName,
  getReviewerApplicationForUser,
} from "@/lib/editorial/reviewer-applications-store";
import { formatLongDate } from "@/lib/formatting/dates";

export const metadata: Metadata = {
  title: "Apply as a Peer Reviewer | IMSU FOSS Journals",
  description:
    "Apply to join the peer review and editorial referee board for Faculty of Social Sciences Journals.",
};

export default async function AuthorApplyReviewerPage({
  searchParams,
}: {
  searchParams: Promise<{ journal?: string }>;
}) {
  const user = await requireApplicationArea("author");
  const [{ journal }, existingApp] = await Promise.all([
    searchParams,
    getReviewerApplicationForUser({ id: user.id, email: user.email ?? "" }),
  ]);

  const hasActiveOrPendingApp =
    existingApp &&
    (existingApp.status === "PENDING" || existingApp.status === "APPROVED");

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div>
        <div className="flex items-center gap-2 font-mono text-xs text-[color:var(--color-subtle)]">
          <Link
            href="/author"
            className="transition hover:text-[color:var(--color-accent)]"
          >
            Author Workspace
          </Link>
          <span>/</span>
          <span className="font-semibold text-[color:var(--color-accent)]">
            Reviewer Application
          </span>
        </div>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-3 py-1 font-mono text-xs font-bold text-[color:var(--color-accent)] uppercase">
          <span>Editorial Governance &amp; Refereeing</span>
        </div>

        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-4xl">
          {hasActiveOrPendingApp
            ? "Reviewer Application Status"
            : "Apply to Become a Peer Reviewer"}
        </h1>

        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[color:var(--color-muted)] sm:text-sm">
          {hasActiveOrPendingApp
            ? "Track the real-time status of your peer reviewer application and referee credentials."
            : "Join the referee pool across Faculty of Social Sciences journals (NJCP, AJSBS, NJSR, GJCSR). Approved reviewers are assigned double-blind manuscripts matching their domain specialization."}
        </p>
      </div>

      {hasActiveOrPendingApp ? (
        <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-mono text-xs text-[color:var(--color-subtle)]">
                Tracking Reference
              </span>
              <p className="font-mono text-base font-bold text-[color:var(--color-accent)] sm:text-lg">
                {existingApp.trackingCode}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 font-mono text-xs font-bold uppercase ${
                  existingApp.status === "APPROVED"
                    ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                    : "border border-amber-500/30 bg-amber-500/15 text-amber-300"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    existingApp.status === "APPROVED"
                      ? "bg-emerald-400"
                      : "animate-pulse bg-amber-400"
                  }`}
                />
                <span>
                  {existingApp.status === "APPROVED"
                    ? "Approved Reviewer"
                    : "Pending Review"}
                </span>
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5 text-xs sm:grid-cols-2">
            <div>
              <span className="font-mono text-[11px] text-[color:var(--color-subtle)]">
                Applicant Name &amp; Rank:
              </span>
              <p className="mt-0.5 font-semibold text-[color:var(--color-foreground)]">
                {formatAcademicName(
                  existingApp.academicTitle,
                  existingApp.fullName,
                )}{" "}
                ({existingApp.academicRank})
              </p>
            </div>

            <div>
              <span className="font-mono text-[11px] text-[color:var(--color-subtle)]">
                Target Journal Scope:
              </span>
              <p className="mt-0.5 font-semibold text-[color:var(--color-accent)]">
                {existingApp.targetJournal === "ALL"
                  ? "All Faculty Journals (NJCP, AJSBS, NJSR, GJCSR)"
                  : existingApp.targetJournal.toUpperCase()}
              </p>
            </div>

            <div>
              <span className="font-mono text-[11px] text-[color:var(--color-subtle)]">
                Institutional Affiliation:
              </span>
              <p className="mt-0.5 text-[color:var(--color-foreground)]">
                {existingApp.affiliation}
              </p>
            </div>

            <div>
              <span className="font-mono text-[11px] text-[color:var(--color-subtle)]">
                Submission Date:
              </span>
              <p
                suppressHydrationWarning
                className="mt-0.5 font-mono text-[color:var(--color-muted)]"
              >
                {formatLongDate(existingApp.submittedAt)}
              </p>
            </div>

            <div className="sm:col-span-2">
              <span className="font-mono text-[11px] text-[color:var(--color-subtle)]">
                Specialization Keywords:
              </span>
              <p className="mt-0.5 text-[color:var(--color-foreground)]">
                {existingApp.specializationKeywords}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]/60 p-4">
            <p className="text-xs leading-relaxed text-[color:var(--color-muted)]">
              {existingApp.status === "APPROVED"
                ? "Your reviewer application has been approved by the Editorial Directorate. You have been provisioned with Editor workspace privileges to referee assigned manuscripts."
                : "Your reviewer application has been received and is currently under evaluation by the Managing Editors. You will be assigned manuscripts matching your domain expertise once review permissions are granted."}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/author"
              className="button-secondary text-xs font-semibold"
            >
              ← Back to Author Workspace
            </Link>
            {existingApp.status === "APPROVED" ? (
              <Link
                href="/workspaces"
                className="button-primary text-xs font-semibold"
              >
                Go to Editor Workspace →
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <ReviewerApplicationForm
          defaultJournal={journal || "ALL"}
          initialFullName={user.displayName}
          initialEmail={user.email ?? ""}
          applicantUserId={user.id}
        />
      )}
    </div>
  );
}
