"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AppNavigationItem = {
  href: string;
  label: string;
  matchSubtree?: boolean;
};

export function NavigationLinks({
  items,
  mobile = false,
}: {
  items: AppNavigationItem[];
  mobile?: boolean;
}) {
  const pathname = usePathname();

  return items.map((item) => {
    const active =
      pathname === item.href ||
      (item.matchSubtree && pathname.startsWith(`${item.href}/`));
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={
          mobile
            ? "block rounded-[var(--radius-md)] px-3 py-3 text-sm font-medium text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface-strong)] focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus)] aria-[current=page]:font-semibold aria-[current=page]:text-[color:var(--color-foreground)]"
            : "app-nav-link"
        }
      >
        {item.label}
      </Link>
    );
  });
}
