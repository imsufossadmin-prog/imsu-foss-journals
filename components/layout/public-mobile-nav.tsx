"use client";

import Link from "next/link";
import { useState } from "react";

type NavigationSubItem = {
  label: string;
  shortName?: string;
  href: string;
  description?: string;
};

type NavigationItem = {
  href: string;
  label: string;
  children?: readonly NavigationSubItem[];
};

type PublicMobileNavProps = {
  items: readonly NavigationItem[];
};

const mobileLinkClass =
  "px-2 py-2 text-sm font-medium text-[color:var(--color-muted)] transition hover:text-[color:var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]";

const actionLinkClass =
  "mt-3 inline-flex w-full items-center justify-center border border-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-[color:var(--color-accent)] transition hover:bg-[color:var(--color-accent)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)]";

export function PublicMobileNav({ items }: PublicMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [journalsExpanded, setJournalsExpanded] = useState(true);

  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen((current) => !current)}
        className="flex items-center gap-2 border border-[color:var(--color-border)] px-3 py-2 text-sm font-semibold text-[color:var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-accent)]"
      >
        <span>Menu</span>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen ? (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="absolute right-0 mt-3 max-h-[85vh] w-80 overflow-y-auto rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 shadow-[var(--shadow-menu)] backdrop-blur-xl"
        >
          <div className="flex flex-col gap-1">
            {items.map((item) => {
              if (item.children && item.children.length > 0) {
                return (
                  <div
                    key={item.label}
                    className="mb-1 border-b border-[color:var(--color-border)] pb-2"
                  >
                    <button
                      type="button"
                      onClick={() => setJournalsExpanded((prev) => !prev)}
                      className="flex w-full items-center justify-between px-2 py-2 text-sm font-semibold text-[color:var(--color-foreground)] hover:text-[color:var(--color-accent)]"
                    >
                      <span>{item.label}</span>
                      <svg
                        aria-hidden="true"
                        className={`size-3.5 transition-transform ${journalsExpanded ? "rotate-180" : ""}`}
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M4 6L8 10L12 6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {journalsExpanded ? (
                      <div className="mt-1 space-y-1 border-l border-[color:var(--color-border)] pl-2">
                        {item.children.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className="flex flex-col rounded-[var(--radius-sm)] px-2 py-1.5 transition hover:bg-[color:var(--color-surface-strong)]"
                            onClick={() => setIsOpen(false)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[color:var(--color-foreground)]">
                                {subItem.label}
                              </span>
                              {subItem.shortName ? (
                                <span className="min-w-[56px] shrink-0 rounded bg-[color:var(--color-surface)] px-2 py-0.5 text-center font-mono text-[9px] font-bold whitespace-nowrap text-[color:var(--color-accent)]">
                                  {subItem.shortName}
                                </span>
                              ) : null}
                            </div>
                            {subItem.description ? (
                              <span className="mt-0.5 text-[10px] text-[color:var(--color-muted)]">
                                {subItem.description}
                              </span>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={mobileLinkClass}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/login"
              className={actionLinkClass}
              onClick={() => setIsOpen(false)}
            >
              Sign in
            </Link>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
