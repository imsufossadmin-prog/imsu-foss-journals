import { AuthenticatedShell } from "@/components/app/authenticated-shell";
import {
  PlatformRoleManager,
  RoleManagementNotice,
  UserSearch,
} from "@/components/admin/role-management";
import { requireGlobalRole } from "@/lib/auth/authorization";
import {
  listRoleManagementJournals,
  searchRoleManagementUsers,
} from "@/lib/auth/role-management-session";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";

import { assignRoleAction, removeRoleAction } from "./actions";

export default async function PlatformAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; notice?: string; error?: string }>;
}) {
  const user = await requireGlobalRole("SUPER_ADMIN");
  const { q = "", notice, error } = await searchParams;
  const [users, journals] = await Promise.all([
    searchRoleManagementUsers(q),
    listRoleManagementJournals(),
  ]);
  const workspaces = getAvailableWorkspaces(user);
  const workspace = workspaces.find(({ area }) => area === "platform")!;

  return (
    <AuthenticatedShell
      user={user}
      workspace={workspace}
      workspaces={workspaces}
      navigation={[
        { href: "/admin", label: "Overview" },
        { href: "/admin/access", label: "Users" },
        { href: "/account", label: "Account" },
      ]}
    >
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
            Platform access
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
            Assign staff roles.
          </h1>
          <p className="mt-4 text-sm leading-6 text-[color:var(--color-muted)]">
            Users sign in with Google first. Search their Google email, then
            assign only the access they need.
          </p>
          <UserSearch query={q} />
          <RoleManagementNotice notice={notice} error={error} />
        </header>
        <PlatformRoleManager
          query={q}
          users={users}
          journals={journals}
          assignAction={assignRoleAction}
          removeAction={removeRoleAction}
        />
      </div>
    </AuthenticatedShell>
  );
}
