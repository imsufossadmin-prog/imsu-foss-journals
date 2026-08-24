"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function SubmissionsFilterBar({
  journals,
  statusOptions,
  selectedDepartment,
  selectedStatus,
}: {
  journals: Array<{ id: string; name: string; slug: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  selectedDepartment: string;
  selectedStatus: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: "department" | "status", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/admin/submissions?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[var(--radius-lg)] bg-[color:var(--color-surface-raised)] p-4">
      <div className="flex items-center gap-2">
        <label
          htmlFor="department-filter"
          className="text-xs font-semibold whitespace-nowrap text-[color:var(--color-muted)]"
        >
          Department:
        </label>
        <select
          id="department-filter"
          value={selectedDepartment}
          onChange={(e) => updateFilter("department", e.target.value)}
          className="app-field py-1.5 pr-8 text-xs font-semibold"
        >
          <option value="all">All Departments</option>
          {journals.map((journal) => (
            <option key={journal.id} value={journal.slug}>
              {journal.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor="status-filter"
          className="text-xs font-semibold whitespace-nowrap text-[color:var(--color-muted)]"
        >
          Status:
        </label>
        <select
          id="status-filter"
          value={selectedStatus}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="app-field py-1.5 pr-8 text-xs font-semibold"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
