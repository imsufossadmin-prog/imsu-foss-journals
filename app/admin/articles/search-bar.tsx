"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminArticlesSearchBar({
  totalCount,
  currentQuery,
}: {
  totalCount: number;
  currentQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(currentQuery || "");
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    } else {
      params.delete("q");
    }
    params.delete("success");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClear = () => {
    setSearchTerm("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("success");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSearch} className="relative flex items-center">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <svg
            className="h-4 w-4 text-[color:var(--color-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search articles by title, author, keyword, or DOI..."
          className="app-field w-full !pr-28 !pl-11 text-xs sm:text-sm"
        />

        <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
          {searchTerm ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-1 text-xs text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-foreground)]"
              title="Clear search"
            >
              ✕
            </button>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-[var(--radius-md)] bg-[color:var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-accent-foreground)] transition hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {currentQuery ? (
        <div className="flex items-center justify-between px-1 text-xs">
          <p className="text-[color:var(--color-muted)]">
            Showing{" "}
            <span className="font-semibold text-[color:var(--color-foreground)]">
              {totalCount}
            </span>{" "}
            {totalCount === 1 ? "article" : "articles"} matching{" "}
            <span className="font-semibold text-[color:var(--color-accent)]">
              &quot;{currentQuery}&quot;
            </span>
          </p>
          <button
            type="button"
            onClick={handleClear}
            className="font-medium text-[color:var(--color-accent)] hover:underline"
          >
            Clear filter
          </button>
        </div>
      ) : null}
    </div>
  );
}
