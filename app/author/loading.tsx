export default function AuthorLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-[color:var(--color-surface-raised)]" />
        <div className="h-10 w-72 rounded bg-[color:var(--color-surface-raised)]" />
        <div className="h-4 w-96 rounded bg-[color:var(--color-surface-raised)]" />
      </div>
      <div className="space-y-4">
        <div className="h-6 w-36 rounded bg-[color:var(--color-surface-raised)]" />
        <div className="h-40 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]" />
      </div>
    </div>
  );
}
