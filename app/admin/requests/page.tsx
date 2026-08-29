import Link from "next/link";
import { redirect } from "next/navigation";

import { DepartmentFilterSelect } from "@/components/admin/department-filter-select";
import { AuthenticatedShell } from "@/components/app/authenticated-shell";
import { RequestStatus } from "@/components/requests/request-components";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";
import {
  getActiveDepartmentJournals,
  listAllPlatformRequests,
} from "@/lib/requests/data";

const date = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; status?: string }>;
}) {
  const user = await requireApplicationArea("admin");
  if (!isSuperAdmin(user)) {
    redirect("/unauthorized?reason=workspace");
  }

  const { department } = await searchParams;
  const workspaces = getAvailableWorkspaces(user);
  const workspace = workspaces.find((item) => item.area === "platform");
  if (!workspace) redirect("/unauthorized?reason=workspace");

  const [journals, requests] = await Promise.all([
    getActiveDepartmentJournals(),
    listAllPlatformRequests(department),
  ]);

  const selectedDepartment = department ?? "all";

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
            Submission Requests
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--color-muted)]">
            Review author inquiries, monitor incoming manuscripts, and
            coordinate requests across all departments.
          </p>
        </div>

        {/* Department Filter Bar */}
        <div>
          <DepartmentFilterSelect
            journals={journals}
            totalCount={requests.length}
          />
        </div>

        {/* Requests List */}
        <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-1">
          {requests.length > 0 ? (
            <ul className="divide-y divide-[color:var(--color-border)]/70">
              {requests.map((request) => (
                <li key={request.id} className="p-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[color:var(--color-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-accent)] uppercase">
                          {request.department?.name ?? request.journal.name}
                        </span>
                        <span className="text-xs font-medium text-[color:var(--color-muted)]">
                          {request.author.displayName}
                        </span>
                      </div>
                      <p className="truncate text-sm font-semibold tracking-[-0.01em] text-[color:var(--color-foreground)]">
                        {request.submission?.title ??
                          `${request.department?.name ?? request.journal.name} submission request`}
                      </p>
                      <p className="text-xs text-[color:var(--color-subtle)]">
                        {request._count.messages} conversation updates · Updated{" "}
                        {date.format(request.updatedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <RequestStatus status={request.status} />
                      <Link
                        href={`/admin/${request.journal.slug}/requests/${request.id}`}
                        prefetch={true}
                        className="button-primary shrink-0 text-xs"
                      >
                        Open request →
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="text-base font-semibold">
                No submission requests yet
              </p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[color:var(--color-muted)]">
                {selectedDepartment !== "all"
                  ? "No requests match the selected department filter."
                  : "New author requests across IMSU FOSS Journals will appear here ready for review."}
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedShell>
  );
}
