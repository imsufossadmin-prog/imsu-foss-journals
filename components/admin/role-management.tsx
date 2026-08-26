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
          placeholder="Search by name or email (e.g. okafor@example.com)..."
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
  const [activeModalUserId, setActiveModalUserId] = useState<string | null>(
    null,
  );
  const [selectedRole, setSelectedRole] = useState<
    "EDITOR" | "JOURNAL_ADMIN" | "SUPER_ADMIN"
  >("EDITOR");

  const filteredUsers = users.filter((user) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      user.displayName.toLowerCase().includes(term) ||
      (user.email && user.email.toLowerCase().includes(term))
    );
  });

  const activeUser = users.find((u) => u.id === activeModalUserId);

  return (
    <div className="mt-6">
      <UserSearch query={searchFilter} onSearchChange={setSearchFilter} />

      {!filteredUsers.length ? (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-8 text-center">
          <p className="text-sm text-[color:var(--color-muted)]">
            No users matched &quot;{searchFilter}&quot;.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-1">
          {filteredUsers.map((user) => {
            const isSuperAdmin = user.globalRoles.some(
              (r) => r.role === "SUPER_ADMIN",
            );
            const jaRoles = user.journalRoles.filter(
              (r) => r.role === "JOURNAL_ADMIN",
            );
            const editorRoles = user.journalRoles.filter(
              (r) => r.role === "EDITOR",
            );

            // Check if user is Journal Admin across all departments
            const isAllDeptJA =
              jaRoles.length >= journals.length && journals.length > 0;
            // Check if user is Editor across all departments
            const isAllDeptEditor =
              editorRoles.length >= journals.length && journals.length > 0;

            const hasStaffRole =
              isSuperAdmin || jaRoles.length > 0 || editorRoles.length > 0;

            return (
              <div
                key={user.id}
                className="group relative flex flex-col justify-between gap-4 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 transition-all hover:border-[color:var(--color-border-strong)] sm:flex-row sm:items-center sm:p-5"
              >
                {/* User Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-surface-strong)] text-xs font-semibold text-[color:var(--color-foreground)]">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-medium text-[color:var(--color-foreground)]">
                        {user.displayName}
                      </h2>
                      <p className="truncate text-xs text-[color:var(--color-muted)]">
                        {user.email ?? "Email available after sign-in"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {isSuperAdmin && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                      <span>Super Admin</span>
                      <form action={removeAction} className="inline">
                        <input
                          type="hidden"
                          name="targetUserId"
                          value={user.id}
                        />
                        <input type="hidden" name="role" value="SUPER_ADMIN" />
                        <button
                          type="submit"
                          aria-label="Remove Super Admin"
                          className="ml-0.5 text-[10px] text-emerald-400/70 hover:text-emerald-300"
                        >
                          ✕
                        </button>
                      </form>
                    </div>
                  )}

                  {isAllDeptJA ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-strong)] px-2.5 py-1 text-xs font-semibold text-[color:var(--color-foreground)]">
                      <span>Journal Admin (All 7 Departments)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModalUserId(user.id);
                          setSelectedRole("JOURNAL_ADMIN");
                        }}
                        className="ml-0.5 text-[10px] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                      >
                        ✎
                      </button>
                    </div>
                  ) : (
                    jaRoles.map((assignment) => (
                      <div
                        key={`ja:${assignment.journalId}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-strong)] px-2.5 py-1 text-xs font-semibold text-[color:var(--color-foreground)]"
                      >
                        <span>JA · {assignment.journal.department.name}</span>
                        <form action={removeAction} className="inline">
                          <input
                            type="hidden"
                            name="targetUserId"
                            value={user.id}
                          />
                          <input
                            type="hidden"
                            name="role"
                            value="JOURNAL_ADMIN"
                          />
                          <input
                            type="hidden"
                            name="journalId"
                            value={assignment.journalId}
                          />
                          <button
                            type="submit"
                            aria-label={`Remove JA for ${assignment.journal.department.name}`}
                            className="ml-0.5 text-[10px] text-[color:var(--color-danger)] hover:opacity-80"
                          >
                            ✕
                          </button>
                        </form>
                      </div>
                    ))
                  )}

                  {isAllDeptEditor ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-muted)]">
                      <span>Editor (All 7 Departments)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModalUserId(user.id);
                          setSelectedRole("EDITOR");
                        }}
                        className="ml-0.5 text-[10px] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                      >
                        ✎
                      </button>
                    </div>
                  ) : (
                    editorRoles.map((assignment) => (
                      <div
                        key={`ed:${assignment.journalId}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-muted)]"
                      >
                        <span>
                          Editor · {assignment.journal.department.name}
                        </span>
                        <form action={removeAction} className="inline">
                          <input
                            type="hidden"
                            name="targetUserId"
                            value={user.id}
                          />
                          <input type="hidden" name="role" value="EDITOR" />
                          <input
                            type="hidden"
                            name="journalId"
                            value={assignment.journalId}
                          />
                          <button
                            type="submit"
                            aria-label={`Remove Editor for ${assignment.journal.department.name}`}
                            className="ml-0.5 text-[10px] text-[color:var(--color-danger)] hover:opacity-80"
                          >
                            ✕
                          </button>
                        </form>
                      </div>
                    ))
                  )}

                  {!hasStaffRole && (
                    <span className="rounded-full bg-[color:var(--color-surface-strong)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--color-muted)]">
                      Author
                    </span>
                  )}
                </div>

                {/* Manage / Add Role CTA */}
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModalUserId(user.id);
                      setSelectedRole("EDITOR");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
                  >
                    <span>+ Manage Role</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Role Assignment Modal with Granular Department Revocation */}
      {activeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-lg)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[color:var(--color-foreground)]">
                Manage Access
              </h3>
              <button
                type="button"
                onClick={() => setActiveModalUserId(null)}
                className="text-sm font-bold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              >
                ✕
              </button>
            </div>

            <p className="mt-1 text-xs text-[color:var(--color-muted)]">
              Privileges for{" "}
              <span className="font-semibold text-[color:var(--color-foreground)]">
                {activeUser.displayName}
              </span>{" "}
              ({activeUser.email}).
            </p>

            {/* Current Active Privileges Breakdown with Granular Revocation */}
            <div className="mt-5 space-y-2.5">
              <p className="text-[11px] font-bold tracking-wider text-[color:var(--color-muted)] uppercase">
                Active Privileges (
                {activeUser.globalRoles.filter((r) => r.role === "SUPER_ADMIN")
                  .length + activeUser.journalRoles.length}
                )
              </p>

              {activeUser.globalRoles.some((r) => r.role === "SUPER_ADMIN") && (
                <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
                  <div>
                    <span className="font-semibold text-emerald-400">
                      Super Admin
                    </span>
                    <p className="text-[11px] text-emerald-400/70">
                      Platform-wide full authority
                    </p>
                  </div>
                  <form action={removeAction}>
                    <input
                      type="hidden"
                      name="targetUserId"
                      value={activeUser.id}
                    />
                    <input type="hidden" name="role" value="SUPER_ADMIN" />
                    <button
                      type="submit"
                      className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30"
                    >
                      Revoke
                    </button>
                  </form>
                </div>
              )}

              {activeUser.journalRoles.map((assignment) => (
                <div
                  key={`modal:${assignment.id}`}
                  className="flex items-center justify-between rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-semibold text-[color:var(--color-foreground)]">
                      {assignment.role === "JOURNAL_ADMIN"
                        ? "Journal Admin"
                        : "Editor"}
                    </span>
                    <span className="mx-1.5 text-[color:var(--color-muted)]">
                      ·
                    </span>
                    <span className="text-[color:var(--color-accent)]">
                      {assignment.journal.department.name}
                    </span>
                  </div>
                  <form action={removeAction}>
                    <input
                      type="hidden"
                      name="targetUserId"
                      value={activeUser.id}
                    />
                    <input type="hidden" name="role" value={assignment.role} />
                    <input
                      type="hidden"
                      name="journalId"
                      value={assignment.journalId}
                    />
                    <button
                      type="submit"
                      className="rounded border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] px-2 py-1 text-[11px] font-semibold text-[color:var(--color-danger)] transition hover:opacity-80"
                    >
                      Revoke
                    </button>
                  </form>
                </div>
              ))}

              {!activeUser.globalRoles.some((r) => r.role === "SUPER_ADMIN") &&
                activeUser.journalRoles.length === 0 && (
                  <p className="rounded-md bg-[color:var(--color-surface-strong)] px-3 py-2 text-xs text-[color:var(--color-muted)]">
                    Standard Author (no staff administrative privileges
                    assigned).
                  </p>
                )}
            </div>

            {/* Add / Grant New Department Assignment */}
            <div className="mt-6 border-t border-[color:var(--color-border)] pt-5">
              <p className="text-[11px] font-bold tracking-wider text-[color:var(--color-muted)] uppercase">
                Grant New Role / Department
              </p>

              <form
                action={async (formData) => {
                  await assignAction(formData);
                }}
                className="mt-3 space-y-3.5"
              >
                <input
                  type="hidden"
                  name="targetUserId"
                  value={activeUser.id}
                />

                <div>
                  <label className="block text-xs font-semibold text-[color:var(--color-muted)]">
                    Privilege Level
                  </label>
                  <select
                    name="role"
                    value={selectedRole}
                    onChange={(e) =>
                      setSelectedRole(
                        e.target.value as
                          "EDITOR" | "JOURNAL_ADMIN" | "SUPER_ADMIN",
                      )
                    }
                    className="app-field mt-1.5 text-xs"
                    required
                  >
                    <option value="EDITOR">
                      Editor (Reviews assigned manuscripts)
                    </option>
                    <option value="JOURNAL_ADMIN">
                      Journal Admin (Operates department)
                    </option>
                    <option value="SUPER_ADMIN">
                      Super Admin (Platform-wide authority)
                    </option>
                  </select>
                </div>

                {selectedRole !== "SUPER_ADMIN" && (
                  <div>
                    <label className="block text-xs font-semibold text-[color:var(--color-muted)]">
                      Target Department
                    </label>
                    <select
                      name="journalId"
                      className="app-field mt-1.5 text-xs"
                      required
                      defaultValue={journals[0]?.id ?? ""}
                    >
                      {journals.map((journal) => (
                        <option key={journal.id} value={journal.id}>
                          {journal.department.name} ({journal.name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalUserId(null)}
                    className="button-secondary text-xs"
                  >
                    Done
                  </button>
                  <button type="submit" className="button-primary text-xs">
                    + Grant Privilege
                  </button>
                </div>
              </form>
            </div>
          </div>
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
      <div className="mt-6 grid gap-3 sm:grid-cols-1">
        {filteredUsers.map((user) => {
          const isEditor = user.journalRoles.some(
            ({ role, journalId: assignedJournalId }) =>
              role === "EDITOR" && assignedJournalId === journalId,
          );
          return (
            <div
              key={user.id}
              className="flex flex-col justify-between gap-4 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 sm:flex-row sm:items-center sm:p-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-surface-strong)] text-xs font-semibold text-[color:var(--color-foreground)]">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-medium text-[color:var(--color-foreground)]">
                      {user.displayName}
                    </h2>
                    <p className="truncate text-xs text-[color:var(--color-muted)]">
                      {user.email ?? "Email available after sign-in"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isEditor ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                    Active Editor
                  </span>
                ) : (
                  <span className="rounded-full bg-[color:var(--color-surface-strong)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--color-muted)]">
                    Author
                  </span>
                )}

                <form action={isEditor ? removeAction : assignAction}>
                  <input type="hidden" name="targetUserId" value={user.id} />
                  <button
                    type="submit"
                    className={
                      isEditor
                        ? "rounded-md border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-danger)] transition hover:opacity-80"
                        : "button-primary text-xs"
                    }
                  >
                    {isEditor ? "Revoke Editor" : "Make Editor"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
