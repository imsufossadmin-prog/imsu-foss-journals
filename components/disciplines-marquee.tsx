"use client";

import Link from "next/link";
import { useState } from "react";

type Discipline = {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  departmentName: string;
  description: string | null;
  articleCount: number;
};

export function DisciplinesMarquee({ journals }: { journals: Discipline[] }) {
  const [showAllModal, setShowAllModal] = useState(false);

  // Duplicate for seamless loop
  const duplicated = [...journals, ...journals, ...journals];

  return (
    <div className="relative">
      <div className="flex items-center justify-between border-b border-[color:var(--color-border)] pb-4">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-[color:var(--color-accent)] uppercase">
            Faculty Research Fields
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-3xl">
            Academic Disciplines
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAllModal(true)}
            className="button-secondary inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold"
          >
            <span>View All Disciplines</span>
            <span>({journals.length})</span>
          </button>
          <Link
            href="/archives"
            className="hidden font-mono text-xs text-[color:var(--color-accent)] hover:underline sm:inline-flex"
          >
            Browse all archives →
          </Link>
        </div>
      </div>

      {/* Sliding Marquee Track */}
      <div className="relative mt-8 overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/60 py-6 backdrop-blur">
        <div className="animate-marquee gap-6 px-4">
          {duplicated.map((j, idx) => {
            const hasArticles = j.articleCount > 0;
            return (
              <Link
                key={`${j.id}-${idx}`}
                href={
                  hasArticles
                    ? `/archives?journal=${j.slug}`
                    : `/archives?journal=${j.slug}&status=upcoming`
                }
                className="group relative flex w-72 shrink-0 flex-col justify-between rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5 transition-all duration-200 hover:border-[color:var(--color-accent)] hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="rounded bg-[color:var(--color-surface-strong)] px-2 py-0.5 font-bold text-[color:var(--color-accent)]">
                      {j.shortName || j.slug.toUpperCase()}
                    </span>
                    {hasArticles ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        {j.articleCount}{" "}
                        {j.articleCount === 1 ? "Paper" : "Papers"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-serif text-base leading-snug font-semibold text-[color:var(--color-foreground)] transition-colors group-hover:text-[color:var(--color-accent)]">
                    {j.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-[color:var(--color-muted)]">
                    {j.departmentName}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[color:var(--color-border)] pt-3 text-[11px] font-semibold text-[color:var(--color-accent)]">
                  <span>{hasArticles ? "Explore Papers" : "In Review"}</span>
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Modal / Dialog to View All Disciplines Grid */}
      {showAllModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-[color:var(--color-border)] pb-4">
              <div>
                <h3 className="font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
                  All Academic Disciplines & Journals
                </h3>
                <p className="text-xs text-[color:var(--color-muted)]">
                  Faculty of Social Sciences, Imo State University
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-2 text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              >
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {journals.map((j) => {
                const hasArticles = j.articleCount > 0;
                return (
                  <Link
                    key={j.id}
                    href={
                      hasArticles
                        ? `/archives?journal=${j.slug}`
                        : `/archives?journal=${j.slug}&status=upcoming`
                    }
                    onClick={() => setShowAllModal(false)}
                    className="flex flex-col justify-between rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5 transition hover:border-[color:var(--color-accent)]"
                  >
                    <div>
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="rounded bg-[color:var(--color-surface-strong)] px-2 py-0.5 font-bold text-[color:var(--color-accent)]">
                          {j.shortName || j.slug.toUpperCase()}
                        </span>
                        {hasArticles ? (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">
                            {j.articleCount}{" "}
                            {j.articleCount === 1 ? "Paper" : "Papers"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-300">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <h4 className="mt-3 font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                        {j.name}
                      </h4>
                      <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                        Department: {j.departmentName}
                      </p>
                      {j.description ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[color:var(--color-subtle)]">
                          {j.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[color:var(--color-border)] pt-3 text-xs font-semibold text-[color:var(--color-accent)]">
                      <span>
                        {hasArticles
                          ? "Explore Department Archives"
                          : "In Review / Volume in Prep"}
                      </span>
                      <span>→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
