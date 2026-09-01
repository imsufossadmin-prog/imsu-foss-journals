import Link from "next/link";

import { SignOutForm } from "@/components/auth/sign-out-form";
import { BrandMark } from "@/components/ui/brand-mark";
import type { ProductWorkspace } from "@/lib/auth/workspaces";

type WorkspaceChooserProps = {
  displayName: string;
  workspaces: ProductWorkspace[];
  title?: string;
  description?: string;
  compact?: boolean;
};

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5">
      <path
        d="M4 10h11m-4-4 4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function WorkspaceChooser({
  displayName,
  workspaces,
  title = `Welcome back, ${displayName.split(" ")[0]}.`,
  description = "Choose the workspace that matches what you want to do next.",
  compact = false,
}: WorkspaceChooserProps) {
  const content = (
    <div className="w-full max-w-3xl">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
          Your workspaces
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-[1.08] font-medium tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[color:var(--color-muted)]">
          {description}
        </p>
      </div>

      <div className="mt-9 divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
        {workspaces.map((workspace) => (
          <Link
            key={workspace.id}
            href={workspace.href}
            className="group grid min-h-28 grid-cols-[1fr_auto] items-center gap-5 py-5 transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-focus)] sm:px-3 sm:hover:bg-[color:var(--color-surface-strong)]"
          >
            <span className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="block text-xs font-semibold text-[color:var(--color-accent)]">
                  {workspace.roleLabel}
                </span>
                {workspace.badge ? (
                  <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                    {workspace.badge}
                  </span>
                ) : null}
              </div>
              <span className="mt-1.5 block text-lg font-semibold tracking-[-0.02em] text-[color:var(--color-foreground)]">
                {workspace.title}
              </span>
              <span className="mt-1.5 block text-sm leading-6 text-[color:var(--color-subtle)]">
                {workspace.description}
              </span>
            </span>

            <span className="grid size-10 place-items-center rounded-full border border-[color:var(--color-border)] text-[color:var(--color-muted)] transition group-hover:border-[color:var(--color-accent)] group-hover:bg-[color:var(--color-accent)] group-hover:text-white">
              <ArrowIcon />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );

  if (compact) return content;

  return (
    <main className="min-h-screen bg-[color:var(--color-app-background)] px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col sm:min-h-[calc(100vh-4rem)]">
        <header className="flex items-center justify-between gap-5">
          <BrandMark />
          <SignOutForm className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-surface-strong)] hover:text-[color:var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]" />
        </header>
        <div className="flex flex-1 items-center py-16 sm:py-20">{content}</div>
      </div>
    </main>
  );
}
