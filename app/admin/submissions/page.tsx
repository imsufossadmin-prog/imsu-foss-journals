import Link from "next/link";
import { redirect } from "next/navigation";
import type { SubmissionStatus } from "@prisma/client";

import { AuthenticatedShell } from "@/components/app/authenticated-shell";
import { SubmissionsFilterBar } from "@/components/admin/submissions-filter-bar";
import { SubmissionStatus as StatusBadge } from "@/components/submissions/submission-status";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";
import { listPlatformSubmissions } from "@/lib/editorial/data";
import { getActiveDepartmentJournals } from "@/lib/requests/data";

const date = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const statusOptions: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "ACCEPTED", label: "Approved / Ready to Publish" },
  { value: "REVIEWS_RECEIVED", label: "Reviews Received" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "AWAITING_REVIEWERS", label: "Awaiting Reviewers" },
  { value: "SUBMITTED", label: "Awaiting Tracking ID" },
];

export default async function PlatformSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; status?: string }>;
}) {
  const user = await requireApplicationArea("admin");
  if (!isSuperAdmin(user)) {
    redirect("/unauthorized?reason=workspace");
  }

  const { department, status } = await searchParams;
  const workspaces = getAvailableWorkspaces(user);
  const workspace = workspaces.find((item) => item.area === "platform");
  if (!workspace) redirect("/unauthorized?reason=workspace");

  const normalizedStatus =
    status === "MANUSCRIPT_SUBMITTED" ? "SUBMITTED" : status;

  const filterStatus =
    normalizedStatus && normalizedStatus !== "all"
      ? (normalizedStatus as SubmissionStatus)
      : undefined;

  const [journals, submissions] = await Promise.all([
    getActiveDepartmentJournals(),
    listPlatformSubmissions({
      departmentSlug: department,
      status: filterStatus,
    }),
  ]);

  const selectedDepartment = department ?? "all";
  const selectedStatus = status ?? "all";

  return (
    <AuthenticatedShell
      user={user}
      workspace={workspace}
      workspaces={workspaces}
      navigation={[
        { href: "/admin", label: "Overview" },
        { href: "/admin/requests", label: "Requests" },
        { href: "/admin/submissions", label: "Manuscripts" },
        { href: "/admin/access", label: "Users" },
      ]}
    >
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div>
          <p className="text-[10px] font-medium tracking-[0.14em] text-[color:var(--color-accent)] uppercase">
            Platform administration
          </p>
          <h1 className="mt-3 font-serif text-3xl leading-[1.12] font-medium tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-4xl">
            Platform Manuscripts Queue
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--color-muted)]">
            Review, manage tracking IDs, assign reviewers, and publish approved
            manuscripts across all IMSU FOSS department journals.
          </p>
        </div>

        {/* Filters */}
        <SubmissionsFilterBar
          journals={journals.map((j) => ({
            id: j.id,
            name: j.department.name,
            slug: j.slug,
          }))}
          statusOptions={statusOptions}
          selectedDepartment={selectedDepartment}
          selectedStatus={selectedStatus}
        />

        {/* Submissions List */}
        <div className="space-y-3">
          {submissions.length > 0 ? (
            submissions.map((submission) => (
              <div
                key={submission.id}
                className="flex flex-col justify-between gap-3 rounded-[var(--radius-lg)] bg-[color:var(--color-surface-raised)] p-5 transition hover:bg-[color:var(--color-surface-strong)] sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[color:var(--color-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-accent)] uppercase">
                      {submission.journal.department.name}
                    </span>
                    {submission.trackingNumber ? (
                      <span className="font-mono text-xs font-semibold text-[color:var(--color-accent)]">
                        {submission.trackingNumber}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-sm font-semibold tracking-[-0.01em] text-[color:var(--color-foreground)]">
                    {submission.title ?? "Untitled manuscript"}
                  </p>
                  <p className="text-xs text-[color:var(--color-subtle)]">
                    Author: {submission.owner.displayName} · Updated{" "}
                    {date.format(submission.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <StatusBadge status={submission.status} />
                  <Link
                    href={`/admin/${submission.journal.slug}/submissions/${submission.id}`}
                    className="button-primary shrink-0 text-xs"
                  >
                    Open manuscript →
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[var(--radius-lg)] bg-[color:var(--color-surface-raised)] p-12 text-center">
              <p className="text-base font-semibold">No manuscripts found</p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[color:var(--color-muted)]">
                No manuscripts match the selected department or status filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedShell>
  );
}
