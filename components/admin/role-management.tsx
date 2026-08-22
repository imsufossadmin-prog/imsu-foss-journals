"use client";

import { useState } from "react";
import type { ManagedRole } from "@prisma/client";

type RoleAction = (formData: FormData) => Promise<void>;

type ManagedUser = {
  id: string;
  email: string | null;
  displayName: string;
  isActive: boolean;
  globalRoles: Array<{ role: "SUPER_ADMIN" | "AUTHOR" }>;
  journalRoles: Array<{
    id: string;
    role: "JOURNAL_ADMIN" | "EDITOR";
    journalId: string;
    journal: {
      name: string;
      slug: string;
      department: { id: string; name: string };
    };
  }>;
};

type ManagedJournal = {
  id: string;
  name: string;
  department: { id: string; name: string };
};

const roleNames: Record<ManagedRole, string> = {
  SUPER_ADMIN: "Super Admin",
  JOURNAL_ADMIN: "Journal Admin",
  EDITOR: "Editor",
};

export function UserSearch({
  query,
  onSearchChange,
}: {
  query: string;
  onSearchChange?: (val: string) => void;
}) {
  return (
    <div className="mt-6 max-w-2xl">
      <label className="sr-only" htmlFor="user-search">
        Search users by name or email
      </label>
      <div className="relative">
        <input
          id="user-search"
          name="q"
          type="search"
          value={query}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search by name or email (e.g. john@company.com)..."
          className="app-field"
          style={{ paddingLeft: "2.5rem" }}
        />
        <svg
          aria-hidden="true"
          className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[color:var(--color-subtle)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>
  );
}

export function RoleManagementNotice({
  notice,
  error,
}: {
  notice?: string;
  error?: string;
}) {
  if (!notice && !error) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`mt-4 max-w-2xl rounded-[var(--radius-md)] border px-4 py-3 text-sm ${
        error
          ? "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] text-[color:var(--color-danger)]"
          : "border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-accent)]"
      }`}
    >
      {error ?? notice}
    </p>
  );
}

function UserIdentity({ user }: { user: ManagedUser }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-[color:var(--color-foreground)]">
        {user.displayName}
      </h2>
      <p className="mt-0.5 text-xs text-[color:var(--color-muted)]">
        {user.email ?? "Email available after sign-in"}
      </p>
    </div>
  );
}

export function PlatformRoleManager({
  query: initialQuery = "",
  users,
  journals,
  assignAction,
  removeAction,
}: {
  query?: string;
  users: ManagedUser[];
  journals: ManagedJournal[];
  assignAction: RoleAction;
  removeAction: RoleAction;
}) {
  const [searchFilter, setSearchFilter] = useState(initialQuery);

  const filteredUsers = users.filter((user) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      user.displayName.toLowerCase().includes(term) ||
      (user.email && user.email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="mt-6">
      <UserSearch query={searchFilter} onSearchChange={setSearchFilter} />

      {!filteredUsers.length ? (
        <p className="mt-8 border-t border-[color:var(--color-border)] pt-6 text-sm text-[color:var(--color-muted)]">
          No users matched &quot;{searchFilter}&quot;.
        </p>
      ) : (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-1">
          <ul className="divide-y divide-[color:var(--color-border)]/70">
            {filteredUsers.map((user) => {
              const staffRoles = [
                ...user.globalRoles.flatMap(({ role }) =>
                  role === "SUPER_ADMIN"
                    ? [
                        {
                          role,
                          journalId: null,
                          label: roleNames.SUPER_ADMIN,
                        },
                      ]
                    : [],
                ),
                ...user.journalRoles.map(({ role, journalId, journal }) => ({
                  role,
                  journalId,
                  label: `${roleNames[role]} · ${journal.department.name}`,
                })),
              ];

              return (
                <li key={user.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <UserIdentity user={user} />

                    {/* Current assigned roles */}
                    <div className="flex flex-wrap items-center gap-2">
                      {staffRoles.length ? (
                        staffRoles.map((assignment) => (
                          <div
                            key={`${assignment.role}:${assignment.journalId ?? "global"}`}
                            className="flex items-center gap-2 rounded-full border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--color-foreground)]"
                          >
                            <span>{assignment.label}</span>
                            <form action={removeAction} className="inline">
                              <input
                                type="hidden"
                                name="targetUserId"
                                value={user.id}
                              />
                              <input
                                type="hidden"
                                name="role"
                                value={assignment.role}
                              />
                              {assignment.journalId ? (
                                <input
                                  type="hidden"
                                  name="journalId"
                                  value={assignment.journalId}
                                />
                              ) : null}
                              <button
                                type="submit"
                                aria-label={`Remove ${assignment.label}`}
                                className="text-xs font-bold text-[color:var(--color-danger)] hover:opacity-80"
                              >
                                ✕
                              </button>
                            </form>
                          </div>
                        ))
                      ) : (
                        <span className="rounded-full bg-[color:var(--color-surface-strong)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--color-muted)]">
                          Author
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role Assignment Form */}
                  <form
                    action={assignAction}
                    className="mt-4 flex flex-col gap-3 border-t border-[color:var(--color-border)]/60 pt-3.5 sm:flex-row sm:items-end"
                  >
                    <input type="hidden" name="targetUserId" value={user.id} />
                    <label className="text-xs font-medium text-[color:var(--color-muted)] sm:w-44">
                      Role
                      <select
                        name="role"
                        className="app-field mt-1 text-xs"
                        required
                        defaultValue="EDITOR"
                      >
                        <option value="EDITOR">Editor</option>
                        <option value="JOURNAL_ADMIN">Journal Admin</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </select>
                    </label>
                    <label className="text-xs font-medium text-[color:var(--color-muted)] sm:flex-1">
                      Department / Journal
                      <select
                        name="journalId"
                        className="app-field mt-1 text-xs"
                        defaultValue=""
                      >
                        <option value="">
                          No department — Super Admin only
                        </option>
                        {journals.map((journal) => (
                          <option key={journal.id} value={journal.id}>
                            {journal.department.name} · {journal.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      className="button-primary shrink-0 text-xs"
                    >
                      Assign role
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function JournalEditorManager({
  query: initialQuery = "",
  users,
  journalId,
  assignAction,
  removeAction,
}: {
  query?: string;
  users: ManagedUser[];
  journalId: string;
  assignAction: RoleAction;
  removeAction: RoleAction;
}) {
  const [searchFilter, setSearchFilter] = useState(initialQuery);

  const filteredUsers = users.filter((user) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      user.displayName.toLowerCase().includes(term) ||
      (user.email && user.email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="mt-6">
      <UserSearch query={searchFilter} onSearchChange={setSearchFilter} />
      <div className="mt-6 divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
        {filteredUsers.map((user) => {
          const isEditor = user.journalRoles.some(
            ({ role, journalId: assignedJournalId }) =>
              role === "EDITOR" && assignedJournalId === journalId,
          );
          return (
            <section
              key={user.id}
              className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <UserIdentity user={user} />
              <form action={isEditor ? removeAction : assignAction}>
                <input type="hidden" name="targetUserId" value={user.id} />
                <button
                  type="submit"
                  className={
                    isEditor
                      ? "button-secondary text-xs"
                      : "button-primary text-xs"
                  }
                >
                  {isEditor ? "Remove Editor" : "Make Editor"}
                </button>
              </form>
            </section>
          );
        })}
      </div>
    </div>
  );
}
