"use client";

import { useState } from "react";
import Link from "next/link";

type OperationalCounts = {
  newRequests: number;
  pendingReceipts: number;
  awaitingTracking: number;
  readyForPublishing?: number;
  publishedArticles?: number;
};

type StaffCounts = {
  journalAdmins: number;
  editors: number;
};

type ActiveJournal = {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  department?: { id: string; name: string } | null;
  isActivated?: boolean;
};

type SuperAdminDashboardProps = {
  operational: OperationalCounts;
  staff: StaffCounts;
  journals: ActiveJournal[];
  isBreakGlass?: boolean;
  activateAction?: (
    prevState: { error?: string; success?: boolean } | undefined,
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean }>;
};

function pluralise(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function OperationalTile({
  count,
  label,
  actionLabel,
  href,
}: {
  count: number;
  label: string;
  actionLabel: string;
  href: string;
}) {
  const hasItems = count > 0;
  return (
    <Link
      href={href}
      prefetch={true}
      className={`group flex flex-col justify-between rounded-[var(--radius-lg)] border bg-[color:var(--color-surface-raised)] p-6 transition hover:border-[color:var(--color-border-strong)] hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)] ${
        hasItems
          ? "border-[color:var(--color-border)]"
          : "border-[color:var(--color-border)] opacity-60"
      }`}
    >
      <div>
        <div className="flex items-start gap-2.5">
          <span
            className={`font-serif text-4xl leading-none font-medium tracking-[-0.035em] ${
              hasItems
                ? "text-[color:var(--color-foreground)]"
                : "text-[color:var(--color-subtle)]"
            }`}
          >
            {count}
          </span>
          {hasItems ? (
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[color:var(--color-accent-secondary)]" />
          ) : null}
        </div>
        <p
          className={`mt-3 text-sm leading-snug font-semibold ${
            hasItems
              ? "text-[color:var(--color-foreground)]"
              : "text-[color:var(--color-subtle)]"
          }`}
        >
          {label}
        </p>
      </div>
      <p className="mt-5 text-xs font-semibold text-[color:var(--color-accent)] transition group-hover:underline group-hover:underline-offset-4">
        {actionLabel} →
      </p>
    </Link>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-2">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-[color:var(--color-muted)] uppercase">
        {children}
      </p>
    </div>
  );
}

export function SuperAdminDashboard({
  operational,
  staff,
  journals,
  isBreakGlass = false,
  activateAction,
}: SuperAdminDashboardProps) {
  const [showAllJournals, setShowAllJournals] = useState(false);
  const totalItems = operational.newRequests + operational.awaitingTracking;

  const visibleJournals = showAllJournals ? journals : journals.slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      {/* Page header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-medium tracking-[0.14em] text-[color:var(--color-accent)] uppercase">
              Platform administration
            </p>
            <span className="text-[color:var(--color-border-strong)]">·</span>
            <span className="rounded-full bg-[color:var(--color-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-accent)]">
              {journals.length}{" "}
              {pluralise(journals.length, "Journal", "Journals")} Active
            </span>
          </div>
          <h1 className="mt-3 max-w-2xl font-serif text-3xl leading-[1.12] font-medium tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-4xl lg:text-[2.75rem]">
            {totalItems > 0
              ? "Here is what needs your attention."
              : "Everything is up to date."}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--color-muted)]">
            Live operational status across all 10 IMSU FOSS Journals. Click any
            journal or action item to manage operations.
          </p>
        </div>
        <div className="shrink-0">
          <Link
            href="/admin/articles/new"
            className="button-primary inline-flex items-center gap-2 text-xs"
          >
            <span>+</span> Direct Publish Manuscript
          </Link>
        </div>
      </header>

      {/* Operational queue */}
      <section>
        <SectionHeader>Operational queue</SectionHeader>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <OperationalTile
            count={operational.awaitingTracking}
            label={pluralise(
              operational.awaitingTracking,
              "Submission awaiting tracking ID",
              "Submissions awaiting tracking IDs",
            )}
            actionLabel="Assign tracking IDs"
            href="/admin/submissions?status=SUBMITTED"
          />
          <OperationalTile
            count={operational.newRequests}
            label={pluralise(
              operational.newRequests,
              "New submission request",
              "New submission requests",
            )}
            actionLabel="View requests"
            href="/admin/requests"
          />
          <OperationalTile
            count={operational.publishedArticles ?? 0}
            label={pluralise(
              operational.publishedArticles ?? 0,
              "Published Article in Catalog",
              "Published Articles in Catalog",
            )}
            actionLabel="Manage catalog"
            href="/admin/articles"
          />
        </div>
      </section>

      {/* Active journals */}
      {journals.length > 0 ? (
        <section>
          <div className="flex items-center justify-between">
            <SectionHeader>
              {pluralise(journals.length, "Active journal", "Active journals")}
            </SectionHeader>
            {journals.length > 4 ? (
              <button
                type="button"
                onClick={() => setShowAllJournals(!showAllJournals)}
                className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
              >
                {showAllJournals
                  ? "Show fewer ↑"
                  : `View all ${journals.length} journals ↓`}
              </button>
            ) : null}
          </div>
          <div className="mt-4 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-1 transition-all">
            <ul className="divide-y divide-[color:var(--color-border)]/70">
              {visibleJournals.map((journal) => (
                <li key={journal.id} className="p-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold tracking-[-0.01em] text-[color:var(--color-foreground)]">
                          {journal.name}
                        </p>
                        {journal.shortName ? (
                          <span className="rounded bg-[color:var(--color-accent-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--color-accent)]">
                            {journal.shortName}
                          </span>
                        ) : null}
                        {journal.isActivated === false ? (
                          <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                            Configuration required
                          </span>
                        ) : isBreakGlass ? (
                          <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                            Operational
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">
                        {journal.department
                          ? `Department: ${journal.department.name}`
                          : "Faculty of Social Sciences Journal"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isBreakGlass &&
                      journal.isActivated === false &&
                      activateAction ? (
                        <form
                          action={async (formData) => {
                            await activateAction(undefined, formData);
                          }}
                        >
                          <input
                            type="hidden"
                            name="journalSlug"
                            value={journal.slug}
                          />
                          <input type="hidden" name="enabled" value="true" />
                          <button
                            type="submit"
                            className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                          >
                            Activate journal
                          </button>
                        </form>
                      ) : null}
                      <Link
                        href={`/admin/${journal.slug}`}
                        prefetch={true}
                        className="shrink-0 text-xs font-semibold text-[color:var(--color-accent)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
                      >
                        Open operations →
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {journals.length > 4 ? (
              <div className="border-t border-[color:var(--color-border)]/70 p-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllJournals(!showAllJournals)}
                  className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
                >
                  {showAllJournals
                    ? "Show fewer journals ↑"
                    : `View all ${journals.length} journals ↓`}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Platform staff */}
      <section>
        <SectionHeader>Platform staff</SectionHeader>
        <div className="mt-5 flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[color:var(--color-muted)]">
            <span className="font-semibold text-[color:var(--color-foreground)]">
              {staff.journalAdmins}
            </span>{" "}
            {pluralise(staff.journalAdmins, "Journal Admin", "Journal Admins")}
            <span className="mx-2 text-[color:var(--color-border-strong)]">
              ·
            </span>
            <span className="font-semibold text-[color:var(--color-foreground)]">
              {staff.editors}
            </span>{" "}
            {pluralise(staff.editors, "Editor", "Editors")} across active
            journals
          </p>
          <Link
            href="/admin/access"
            prefetch={true}
            className="shrink-0 text-xs font-semibold text-[color:var(--color-accent)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
          >
            Manage users →
          </Link>
        </div>
      </section>
    </div>
  );
}
