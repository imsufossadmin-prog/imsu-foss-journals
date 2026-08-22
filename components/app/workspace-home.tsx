type WorkspaceHomeProps = {
  eyebrow: string;
  title: string;
  description: string;
  note: string;
};

export function WorkspaceHome({
  eyebrow,
  title,
  description,
  note,
}: WorkspaceHomeProps) {
  return (
    <div className="max-w-4xl">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.08] font-medium tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-5xl lg:text-[3.5rem]">
        {title}
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--color-muted)] sm:text-lg sm:leading-8">
        {description}
      </p>

      <section className="mt-16 border-t border-[color:var(--color-border)] pt-7 sm:mt-20 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-8">
        <h2 className="text-sm font-semibold text-[color:var(--color-foreground)]">
          Workspace status
        </h2>
        <div className="mt-3 sm:mt-0">
          <p className="max-w-xl text-sm leading-6 text-[color:var(--color-muted)]">
            {note}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--color-accent)]">
            <span className="size-1.5 rounded-full bg-[color:var(--color-accent-secondary)]" />
            Your identity and access are ready
          </p>
        </div>
      </section>
    </div>
  );
}
