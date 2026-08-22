import Link from "next/link";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/config/site";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <Container className="py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-semibold text-[color:var(--color-foreground)]">
              {siteConfig.name}
            </p>
            <p className="mt-2 max-w-md text-sm text-[color:var(--color-muted)]">
              {siteConfig.faculty}, {siteConfig.institution}
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-5 gap-y-3"
          >
            {siteConfig.publicNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-[color:var(--color-muted)] transition hover:text-[color:var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-accent)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-10 text-sm text-[color:var(--color-muted)]">
          &copy; {currentYear} {siteConfig.name}
        </p>
      </Container>
    </footer>
  );
}
