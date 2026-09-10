"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/lib/config/site";

const navigationLinkClass =
  "text-sm font-medium text-[color:var(--color-muted)] transition hover:text-[color:var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-accent)]";

export function PublicDesktopNav() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <nav
      aria-label="Primary navigation"
      className="hidden items-center gap-7 lg:flex"
    >
      {siteConfig.publicNavigation.map((item) => {
        if ("children" in item && item.children) {
          return (
            <div
              key={item.label}
              ref={dropdownRef}
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="true"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 ${navigationLinkClass} ${
                  isOpen ? "text-[color:var(--color-accent)]" : ""
                }`}
              >
                <span>{item.label}</span>
                <svg
                  aria-hidden="true"
                  className={`size-3.5 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-[color:var(--color-accent)]" : ""
                  }`}
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isOpen ? (
                <div className="animate-in fade-in slide-in-from-top-2 absolute top-full left-0 z-30 w-80 pt-2.5 duration-150">
                  <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-2 shadow-[var(--shadow-menu)] backdrop-blur-xl">
                    <div className="border-b border-[color:var(--color-border)] px-3 py-2">
                      <p className="font-mono text-[10px] font-bold tracking-wider text-[color:var(--color-accent)] uppercase">
                        Active Faculty Journals
                      </p>
                    </div>

                    <div className="mt-1 space-y-1">
                      {item.children.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setIsOpen(false)}
                          className="group flex flex-col rounded-[var(--radius-md)] p-2.5 transition hover:bg-[color:var(--color-surface-strong)]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-[color:var(--color-foreground)] transition group-hover:text-[color:var(--color-accent)]">
                              {subItem.label}
                            </span>
                            <span className="min-w-[56px] shrink-0 rounded bg-[color:var(--color-surface)] px-2 py-0.5 text-center font-mono text-[9px] font-bold whitespace-nowrap text-[color:var(--color-accent)]">
                              {subItem.shortName}
                            </span>
                          </div>
                          <span className="mt-0.5 text-[11px] text-[color:var(--color-muted)]">
                            {subItem.description}
                          </span>
                        </Link>
                      ))}
                    </div>

                    <div className="mt-1 border-t border-[color:var(--color-border)] pt-1">
                      <Link
                        href="/archives"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold text-[color:var(--color-accent)] transition hover:bg-[color:var(--color-surface-strong)]"
                      >
                        <span>Browse All Archives</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={navigationLinkClass}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
