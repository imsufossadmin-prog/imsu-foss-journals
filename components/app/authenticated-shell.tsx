import Link from "next/link";
import type { ReactNode } from "react";

import {
  NavigationLinks,
  type AppNavigationItem,
} from "@/components/app/navigation-links";
import { SignOutForm } from "@/components/auth/sign-out-form";
import { BrandMark } from "@/components/ui/brand-mark";
import type { ProductWorkspace } from "@/lib/auth/workspaces";

import { ThemeToggle } from "@/components/app/theme-toggle";

type ShellUser = {
  displayName: string;
  email: string | null;
};

type AuthenticatedShellProps = {
  children: ReactNode;
  user: ShellUser;
  workspace: ProductWorkspace;
  workspaces: ProductWorkspace[];
  journalWorkspaces?: ProductWorkspace[];
  currentSection?: "overview" | "account";
  navigation?: AppNavigationItem[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function AccountMenu({ user }: { user: ShellUser }) {
  return (
    <details name="shell-menu" className="app-popover group relative">
      <summary
        aria-label="Open account menu"
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-xs font-bold text-[color:var(--color-accent)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
      >
        {initials(user.displayName)}
      </summary>
      <div className="absolute top-[calc(100%+0.65rem)] right-0 z-40 w-72 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-2 shadow-[var(--shadow-menu)]">
        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
            {user.displayName}
          </p>
          <p className="mt-1 truncate text-xs text-[color:var(--color-subtle)]">
            {user.email ?? "Authenticated account"}
          </p>
        </div>
        <div className="my-1 h-px bg-[color:var(--color-border)]" />
        <Link
          href="/account"
          className="block rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-surface-strong)] hover:text-[color:var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus)]"
        >
          Account and memberships
        </Link>
        <SignOutForm className="mt-1 w-full rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm font-medium text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-surface-strong)] hover:text-[color:var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus)]" />
      </div>
    </details>
  );
}

export function AuthenticatedShell({
  children,
  user,
  workspace,
  workspaces,
  journalWorkspaces = [],
  currentSection = "overview",
  navigation,
}: AuthenticatedShellProps) {
  void journalWorkspaces;
  void currentSection;
  const availableWorkspaces = workspaces.some(
    (item) => item.id === workspace.id,
  )
    ? workspaces
    : [workspace, ...workspaces];
  const overviewHref = workspace.href;
  const navigationItems = navigation ?? [
    { href: overviewHref, label: "Overview" },
  ];

  return (
    <div className="min-h-screen bg-[color:var(--color-app-background)]">
      <header className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-[90rem] items-center gap-6 px-4 sm:px-6 lg:px-8">
          <div className="shrink-0">
            <BrandMark href={overviewHref} />
          </div>
          <nav
            aria-label="Workspace navigation"
            className="hidden h-full items-center gap-6 pl-4 md:flex"
          >
            <NavigationLinks items={navigationItems} />
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <details
              name="shell-menu"
              className="app-popover group relative md:hidden"
            >
              <summary
                aria-label="Open workspace navigation"
                className="grid size-11 cursor-pointer list-none place-items-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] text-[color:var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5">
                  <path
                    d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </summary>
              <div className="absolute top-[calc(100%+0.65rem)] right-0 z-40 w-[min(21rem,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-3 shadow-[var(--shadow-menu)]">
                <nav aria-label="Mobile workspace navigation">
                  <NavigationLinks items={navigationItems} mobile />
                </nav>
                {availableWorkspaces.length > 1 ? (
                  <div className="mt-3 border-t border-[color:var(--color-border)] pt-3">
                    <Link
                      href="/workspaces"
                      className="block rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface-strong)]"
                    >
                      Switch workspace
                    </Link>
                  </div>
                ) : null}
              </div>
            </details>
            <ThemeToggle />
            <AccountMenu user={user} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[90rem] overflow-x-hidden px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {children}
      </main>
    </div>
  );
}
