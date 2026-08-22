import { AuthenticatedShell } from "@/components/app/authenticated-shell";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import {
  getAvailableWorkspaces,
  getPostLoginDestination,
  type ProductWorkspace,
} from "@/lib/auth/workspaces";

const roleNames = {
  SUPER_ADMIN: "Super Administrator",
  AUTHOR: "Author",
  JOURNAL_ADMIN: "Journal Administrator",
  EDITOR: "Editor",
} as const;

export default async function AccountPage() {
  const user = await requireAuthenticatedUser();
  const workspaces = getAvailableWorkspaces(user);
  const returnHref = getPostLoginDestination(user);
  const workspace: ProductWorkspace = {
    id: "account:identity",
    href: returnHref,
    area: "author",
    roleLabel: "Account",
    title: "Identity and memberships",
    description: "Account profile and access memberships.",
    journal: null,
  };

  return (
    <AuthenticatedShell
      user={user}
      workspace={workspace}
      workspaces={workspaces}
      currentSection="account"
    >
      <div className="max-w-4xl">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
          Account
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight font-medium tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-5xl">
          Identity and memberships
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--color-muted)]">
          This is the identity the platform uses to resolve your workspaces and
          journal access.
        </p>

        <section className="mt-12 border-t border-[color:var(--color-border)] pt-7 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-8">
          <h2 className="text-sm font-semibold text-[color:var(--color-foreground)]">
            Profile
          </h2>
          <dl className="mt-5 divide-y divide-[color:var(--color-border)] sm:mt-0">
            <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-5">
              <dt className="text-xs font-medium text-[color:var(--color-subtle)]">
                Name
              </dt>
              <dd className="text-sm font-semibold text-[color:var(--color-foreground)]">
                {user.displayName}
              </dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-5">
              <dt className="text-xs font-medium text-[color:var(--color-subtle)]">
                Email
              </dt>
              <dd className="text-sm break-words text-[color:var(--color-foreground)]">
                {user.email ?? "Available from your authenticated account"}
              </dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-5">
              <dt className="text-xs font-medium text-[color:var(--color-subtle)]">
                Status
              </dt>
              <dd className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--color-accent)]">
                <span className="size-1.5 rounded-full bg-[color:var(--color-accent-secondary)]" />
                Active
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-12 border-t border-[color:var(--color-border)] pt-7 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-8">
          <div>
            <h2 className="text-sm font-semibold text-[color:var(--color-foreground)]">
              Memberships
            </h2>
            <p className="mt-2 text-xs leading-5 text-[color:var(--color-subtle)]">
              Assigned by platform administrators.
            </p>
          </div>
          <div className="mt-5 divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)] sm:mt-0">
            {user.globalRoles.map(({ role }) => (
              <div key={role} className="py-4">
                <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  {roleNames[role]}
                </p>
                <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                  Platform membership
                </p>
              </div>
            ))}
            {user.journalRoles.map(({ id, role, journal }) => (
              <div key={id} className="py-4">
                <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  {roleNames[role]}
                </p>
                <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                  {journal.name}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AuthenticatedShell>
  );
}
