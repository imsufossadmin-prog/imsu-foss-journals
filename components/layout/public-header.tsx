import Link from "next/link";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { PublicMobileNav } from "@/components/layout/public-mobile-nav";
import { BrandMark } from "@/components/ui/brand-mark";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/config/site";

const navigationLinkClass =
  "text-sm font-medium text-[color:var(--color-muted)] transition hover:text-[color:var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-accent)]";

const actionLinkClass =
  "inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--color-accent)]/50 bg-[color:var(--color-surface-strong)] px-4 py-2 text-sm font-semibold text-[color:var(--color-accent)] transition hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-accent)]";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/90 backdrop-blur-md">
      <Container>
        <div className="flex min-h-20 items-center justify-between gap-6">
          <BrandMark href="/" />

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-7 lg:flex"
          >
            {siteConfig.publicNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navigationLinkClass}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden lg:block">
              <Link href="/login" className={actionLinkClass}>
                Sign in
              </Link>
            </div>
            <PublicMobileNav items={siteConfig.publicNavigation} />
          </div>
        </div>
      </Container>
    </header>
  );
}
