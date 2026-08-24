export default function Loading() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center p-8 text-center">
      <div className="relative flex size-12 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-[color:var(--color-accent)] opacity-25" />
        <div className="size-8 animate-spin rounded-full border-2 border-[color:var(--color-accent)] border-t-transparent" />
      </div>
      <p className="mt-4 text-xs font-semibold tracking-wider text-[color:var(--color-subtle)] uppercase">
        Loading IMSU FOSS Journals…
      </p>
    </div>
  );
}
