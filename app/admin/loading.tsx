export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-36 rounded bg-[color:var(--color-surface-raised)]" />
        <div className="h-10 w-80 rounded bg-[color:var(--color-surface-raised)]" />
        <div className="h-4 w-96 rounded bg-[color:var(--color-surface-raised)]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-32 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]" />
        <div className="h-32 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]" />
        <div className="h-32 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]" />
      </div>
      <div className="space-y-4">
        <div className="h-6 w-48 rounded bg-[color:var(--color-surface-raised)]" />
        <div className="h-48 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]" />
      </div>
    </div>
  );
}
