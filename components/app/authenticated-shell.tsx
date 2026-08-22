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

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
      <path
        d="m4.5 6 3.5 3.5L11.5 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function WorkspaceMenu({
  current,
  workspaces,
}: {
  current: ProductWorkspace;
  workspaces: ProductWorkspace[];
}) {
  const alternatives = workspaces.filter((item) => item.id !== current.id);

  if (alternatives.length === 0) {
    return (
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-[color:var(--color-subtle)]">
          {current.roleLabel}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold tracking-[-0.01em] text-[color:var(--color-foreground)]">
          {current.title}
        </p>
      </div>
    );
  }

  return (
    <details name="shell-menu" className="app-popover group relative min-w-0">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left transition hover:bg-[color:var(--color-surface-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-[color:var(--color-subtle)]">
            {current.roleLabel}
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold tracking-[-0.01em] text-[color:var(--color-foreground)]">
            {current.title}
          </span>
        </span>
        <span className="text-[color:var(--color-subtle)] transition group-open:rotate-180">
          <ChevronIcon />
        </span>
      </summary>
      <div className="absolute top-[calc(100%+0.65rem)] left-0 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-2 shadow-[var(--shadow-menu)]">
        <p className="px-3 pt-1 pb-2 text-[10px] font-semibold tracking-[0.11em] text-[color:var(--color-subtle)] uppercase">
          Change workspace
        </p>
        {alternatives.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="block rounded-[var(--radius-md)] px-3 py-3 transition hover:bg-[color:var(--color-surface-strong)] focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus)]"
          >
            <span className="block text-xs font-medium text-[color:var(--color-accent)]">
              {item.roleLabel}
            </span>
            <span className="mt-1 block text-sm font-semibold text-[color:var(--color-foreground)]">
              {item.title}
            </span>
          </Link>
        ))}
        <Link
          href="/workspaces"
          className="mt-1 block rounded-[var(--radius-md)] px-3 py-2.5 text-xs font-semibold text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-surface-strong)] hover:text-[color:var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus)]"
        >
          View all workspaces
        </Link>
      </div>
    </details>
  );
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
  const availableWorkspaces = workspaces.some(
    (item) => item.id === workspace.id,
  )
    ? workspaces
    : [workspace, ...workspaces];
  const overviewHref = workspace.href;
  const navigationItems = navigation ?? [
    { href: overviewHref, label: "Overview" },
    { href: "/account", label: "Account" },
  ];

  return (
    <div className="min-h-screen bg-[color:var(--color-app-background)]">
      <header className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.75rem] max-w-[90rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <div className="shrink-0 lg:w-[17rem]">
            <BrandMark href={overviewHref} />
          </div>
          <div className="hidden min-w-0 flex-1 border-l border-[color:var(--color-border)] pl-5 md:block">
            <WorkspaceMenu
              current={workspace}
              workspaces={availableWorkspaces}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
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
                <p className="px-2 text-xs font-medium text-[color:var(--color-subtle)]">
                  {workspace.roleLabel}
                </p>
                <p className="mt-1 px-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                  {workspace.title}
                </p>
                <nav aria-label="Mobile workspace navigation" className="mt-4">
                  <NavigationLinks items={navigationItems} mobile />
                </nav>
                {availableWorkspaces.length > 1 ? (
                  <div className="mt-3 border-t border-[color:var(--color-border)] pt-3">
                    <Link
                      href="/workspaces"
                      className="block rounded-[var(--radius-md)] px-3 py-3 text-sm font-medium text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface-strong)] focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus)]"
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
        <div className="border-t border-[color:var(--color-border)] md:hidden">
          <div className="mx-auto max-w-[90rem] px-4 py-2 sm:px-6">
            <WorkspaceMenu
              current={workspace}
              workspaces={availableWorkspaces}
            />
          </div>
        </div>
      </header>

      <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]">
        <div className="mx-auto hidden h-12 max-w-[90rem] items-center gap-7 px-6 md:flex lg:px-8">
          <nav
            aria-label="Workspace navigation"
            className="flex h-full items-center gap-7"
          >
            {navigation ? (
              <NavigationLinks items={navigationItems} />
            ) : (
              <>
                <Link
                  href={overviewHref}
                  aria-current={
                    currentSection === "overview" ? "page" : undefined
                  }
                  className="app-nav-link"
                >
                  Overview
                </Link>
                <Link
                  href="/account"
                  aria-current={
                    currentSection === "account" ? "page" : undefined
                  }
                  className="app-nav-link"
                >
                  Account
                </Link>
              </>
            )}
          </nav>
          {journalWorkspaces.length > 1 ? (
            <div className="ml-auto flex items-center gap-2 text-xs text-[color:var(--color-subtle)]">
              <span>Journal context</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[color:var(--color-foreground)]">
                {workspace.journal?.shortName ?? workspace.journal?.name}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <main className="mx-auto w-full max-w-[90rem] overflow-x-hidden px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {children}
      </main>
    </div>
  );
}
