export default function AdminLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading admin workspace"
      className="min-h-screen bg-[color:var(--color-app-background)]"
    >
      <div className="h-[4.5rem] border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]" />
      <main className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-5xl animate-pulse space-y-8">
          <div className="space-y-3">
            <div className="h-3 w-32 rounded bg-[color:var(--color-surface-strong)]" />
            <div className="h-10 w-full max-w-xl rounded bg-[color:var(--color-surface-strong)]" />
            <div className="h-4 w-full max-w-lg rounded bg-[color:var(--color-surface-strong)]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-36 rounded-[var(--radius-lg)] bg-[color:var(--color-surface-raised)]"
              />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-20 rounded-[var(--radius-lg)] bg-[color:var(--color-surface-raised)]"
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
