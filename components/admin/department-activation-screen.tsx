"use client";

import { useActionState } from "react";

type JournalInfo = {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  department?: { name: string } | null;
};

type ActivationState = {
  error?: string;
  success?: boolean;
};

function LockIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function DepartmentActivationScreen({
  journal,
  isBreakGlass = false,
  action,
}: {
  journal: JournalInfo;
  isBreakGlass?: boolean;
  action?: (
    prevState: ActivationState | undefined,
    formData: FormData,
  ) => Promise<ActivationState>;
}) {
  const [state, formAction, isPending] = useActionState<
    ActivationState,
    FormData
  >(action ?? (async () => ({})), {});

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-4 py-12">
      <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <LockIcon className="size-5" />
          </div>
          <div>
            <span className="rounded bg-[color:var(--color-accent-soft)] px-2 py-0.5 text-[11px] font-bold tracking-wide text-[color:var(--color-accent)] uppercase">
              {journal.shortName ?? journal.name}
            </span>
            <h1 className="mt-1 font-serif text-2xl font-medium tracking-tight text-[color:var(--color-foreground)] sm:text-3xl">
              {journal.name}
            </h1>
          </div>
        </div>

        <div className="mt-6 border-t border-[color:var(--color-border)]/70 pt-6">
          <p className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
            Department configuration required
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-muted)]">
            This department has not yet been configured for journal operations.
          </p>
          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
            Contact developer Martinz for configuration.
          </p>

          {isBreakGlass && action ? (
            <form action={formAction} className="mt-6">
              <input type="hidden" name="journalSlug" value={journal.slug} />
              <input type="hidden" name="enabled" value="true" />

              {state?.error ? (
                <div className="mb-4 rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-400">
                  {state.error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="button-primary w-full justify-center py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {isPending ? "Activating..." : "Activate journal"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
