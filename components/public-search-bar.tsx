"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublicSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/archives?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/archives");
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-xl">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, keyword, or DOI (e.g. 10.4314)..."
          className="h-12 w-full rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/80 pr-24 pl-11 text-xs text-[color:var(--color-foreground)] shadow-[var(--shadow-card)] backdrop-blur-md transition-all placeholder:text-[color:var(--color-subtle)] focus:border-[color:var(--color-accent)] focus:bg-[color:var(--color-surface)] focus:ring-1 focus:ring-[color:var(--color-accent)] focus:outline-none"
        />
        <svg
          className="pointer-events-none absolute left-4 size-4 text-[color:var(--color-subtle)]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <button
          type="submit"
          className="absolute right-1.5 inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-surface-strong)] px-3.5 text-xs font-semibold text-[color:var(--color-accent)] transition hover:bg-[color:var(--color-accent)] hover:text-black"
        >
          Search
        </button>
      </div>
    </form>
  );
}
