import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  compact?: boolean;
};

export function BrandMark({ href = "/", compact = false }: BrandMarkProps) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-3 rounded-[var(--radius-sm)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-focus)]"
    >
      <span className="grid size-9 place-items-center rounded-[var(--radius-sm)] bg-[color:var(--color-accent)] font-serif text-[15px] font-semibold tracking-[-0.03em] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]">
        FJ
      </span>
      {compact ? null : (
        <span className="leading-tight">
          <span className="block text-[13px] font-semibold tracking-[-0.01em] text-[color:var(--color-foreground)]">
            IMSU FOSS Journals
          </span>
          <span className="mt-0.5 block text-[10px] font-medium tracking-[0.08em] text-[color:var(--color-subtle)] uppercase">
            Imo State University
          </span>
        </span>
      )}
    </Link>
  );
}
