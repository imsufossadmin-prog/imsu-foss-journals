"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-[color:var(--color-app-background)] px-5 py-16">
      <div className="max-w-lg text-center">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
          IMSU FOSS Journals
        </p>
        <h1 className="mt-4 font-serif text-4xl font-medium tracking-[-0.035em] text-[color:var(--color-foreground)]">
          We couldn’t load this workspace.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[color:var(--color-muted)]">
          The connection may be temporarily unavailable. Your account and data
          have not been changed.
        </p>
        <button type="button" onClick={reset} className="button-primary mt-7">
          Try again
        </button>
      </div>
    </main>
  );
}
