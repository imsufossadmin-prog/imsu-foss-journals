import Link from "next/link";

type OperationalCounts = {
  newRequests: number;
  pendingReceipts: number;
  awaitingTracking: number;
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
  department: { id: string; name: string };
};

type SuperAdminDashboardProps = {
  operational: OperationalCounts;
  staff: StaffCounts;
  journals: ActiveJournal[];
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
    <div className="flex items-center gap-3 border-t border-[color:var(--color-border)] pt-6">
      <p className="shrink-0 text-[10px] font-medium tracking-[0.14em] text-[color:var(--color-muted)] uppercase">
        {children}
      </p>
      <div className="h-px flex-1 bg-[color:var(--color-border)]" />
    </div>
  );
}

export function SuperAdminDashboard({
  operational,
  staff,
  journals,
}: SuperAdminDashboardProps) {
  const totalItems =
    operational.newRequests +
    operational.pendingReceipts +
    operational.awaitingTracking;

  return (
    <div className="max-w-5xl">
      {/* Page header */}
      <header>
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
          Live operational status across IMSU FOSS Journals. Click any action
          item to manage department operations.
        </p>
      </header>

      {/* Operational queue */}
      <section className="mt-10 sm:mt-12">
        <SectionHeader>Operational queue</SectionHeader>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <OperationalTile
            count={operational.pendingReceipts}
            label={pluralise(
              operational.pendingReceipts,
              "Receipt awaiting review",
              "Receipts awaiting review",
            )}
            actionLabel="Review receipts"
            href={journals[0] ? `/admin/${journals[0].slug}` : "/admin/access"}
          />
          <OperationalTile
            count={operational.awaitingTracking}
            label={pluralise(
              operational.awaitingTracking,
              "Submission awaiting tracking ID",
              "Submissions awaiting tracking IDs",
            )}
            actionLabel="Assign tracking IDs"
            href={journals[0] ? `/admin/${journals[0].slug}` : "/admin/access"}
          />
          <OperationalTile
            count={operational.newRequests}
            label={pluralise(
              operational.newRequests,
              "New submission request",
              "New submission requests",
            )}
            actionLabel="View requests"
            href={journals[0] ? `/admin/${journals[0].slug}` : "/admin/access"}
          />
        </div>
      </section>

      {/* Active departments */}
      {journals.length > 0 ? (
        <section className="mt-10 sm:mt-12">
          <SectionHeader>
            {pluralise(
              journals.length,
              "Active department",
              "Active departments",
            )}
          </SectionHeader>
          <div className="mt-5 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-1">
            <ul className="divide-y divide-[color:var(--color-border)]/70">
              {journals.map((journal) => (
                <li key={journal.id} className="p-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold tracking-[-0.01em] text-[color:var(--color-foreground)]">
                        {journal.department.name}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">
                        {journal.name}
                      </p>
                    </div>
                    <Link
                      href={`/admin/${journal.slug}`}
                      className="shrink-0 text-xs font-semibold text-[color:var(--color-accent)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
                    >
                      Open operations →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Platform staff */}
      <section className="mt-10 sm:mt-12">
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
            className="shrink-0 text-xs font-semibold text-[color:var(--color-accent)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
          >
            Manage users →
          </Link>
        </div>
      </section>
    </div>
  );
}
