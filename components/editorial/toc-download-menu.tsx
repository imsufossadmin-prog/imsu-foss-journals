"use client";

import { useEffect, useRef, useState } from "react";

export function TOCDownloadMenu({ issueId }: { issueId: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span>📥 Download TOC</span>
        <span className="text-[10px] text-[color:var(--color-muted)]">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-48 rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] py-1.5 shadow-xl">
          <div className="border-b border-[color:var(--color-border)]/60 px-3 py-1 text-[10px] font-bold tracking-wider text-[color:var(--color-muted)] uppercase">
            Table of Contents
          </div>
          <a
            href={`/api/issues/${issueId}/toc?format=pdf`}
            download
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent)]"
          >
            <span>PDF Document</span>
            <span className="text-[10px] text-[color:var(--color-muted)]">
              .pdf
            </span>
          </a>
          <a
            href={`/api/issues/${issueId}/toc?format=html`}
            download
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent)]"
          >
            <span>Web Page / HTML</span>
            <span className="text-[10px] text-[color:var(--color-muted)]">
              .html
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
