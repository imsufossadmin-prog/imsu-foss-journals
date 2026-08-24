"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function DepartmentFilterSelect({
  journals,
  totalCount,
}: {
  journals: Array<{ id: string; slug: string; department: { name: string } }>;
  totalCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentDepartment = searchParams.get("department") ?? "all";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "all") {
      router.push("/admin/requests");
    } else {
      router.push(`/admin/requests?department=${value}`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        htmlFor="department-filter"
        className="text-[10px] font-bold tracking-[0.14em] text-[color:var(--color-muted)] uppercase"
      >
        Filter by Department:
      </label>
      <select
        id="department-filter"
        value={currentDepartment}
        onChange={handleChange}
        className="app-field max-w-xs cursor-pointer rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-3 py-2 text-xs font-semibold text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-accent)] focus:ring-1 focus:ring-[color:var(--color-accent)] focus:outline-none"
      >
        <option value="all">All Departments ({totalCount})</option>
        {journals.map((journal) => (
          <option key={journal.id} value={journal.slug}>
            {journal.department.name}
          </option>
        ))}
      </select>
    </div>
  );
}
