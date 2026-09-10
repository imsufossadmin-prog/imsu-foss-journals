import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getPublicAnnouncements } from "@/lib/editorial/announcements-store";
import { formatLongDate } from "@/lib/formatting/dates";

export const metadata: Metadata = {
  title: "Announcements & Calls for Papers | IMSU FOSS Journals",
  description:
    "Official calls for papers, special issue deadlines, and publishing updates across Faculty of Social Sciences Journals, Imo State University.",
};

const JOURNALS = [
  { slug: "ALL", name: "All Announcements" },
  { slug: "njcp", name: "NJCP" },
  { slug: "ajsbs", name: "AJSBS" },
  { slug: "njsr", name: "NJSR" },
  { slug: "gjcsr", name: "GJCSR" },
];

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ journal?: string }>;
}) {
  const { journal: activeJournal = "ALL" } = await searchParams;
  const announcements = await getPublicAnnouncements(
    activeJournal === "ALL" ? undefined : activeJournal,
  );

  return (
    <div className="pt-8 pb-24 sm:pt-12">
      <Container>
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Journal Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto border-b border-[color:var(--color-border)] pb-3">
            {JOURNALS.map((j) => (
              <Link
                key={j.slug}
                href={
                  j.slug === "ALL"
                    ? "/announcements"
                    : `/announcements?journal=${j.slug}`
                }
                className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                  activeJournal === j.slug
                    ? "bg-[color:var(--color-accent)] text-black"
                    : "border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                }`}
              >
                {j.name}
              </Link>
            ))}
          </div>

          {/* Announcement Items */}
          {announcements.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-12 text-center">
              <p className="font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                No Active Announcements
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-[color:var(--color-muted)]">
                There are no current notices matching this filter. Check back
                soon or view all faculty announcements.
              </p>
              <div className="mt-4">
                <Link
                  href="/announcements"
                  className="button-secondary text-xs"
                >
                  View All Announcements
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {announcements.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-sm transition hover:border-[color:var(--color-accent)]/50 sm:p-7"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--color-border)] pb-3">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span
                        className={`rounded px-2.5 py-0.5 font-bold uppercase ${
                          item.category === "CALL_FOR_PAPERS"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : item.category === "SPECIAL_ISSUE"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-blue-500/15 text-blue-400"
                        }`}
                      >
                        {item.category.replace(/_/g, " ")}
                      </span>
                      <span>·</span>
                      <span className="text-[color:var(--color-accent)] uppercase">
                        {item.targetJournal === "ALL"
                          ? "All Faculty Journals"
                          : `Journal: ${item.targetJournal.toUpperCase()}`}
                      </span>
                    </div>

                    <span
                      suppressHydrationWarning
                      className="font-mono text-xs text-[color:var(--color-subtle)]"
                    >
                      {formatLongDate(item.publishedAt)}
                    </span>
                  </div>

                  <h2 className="mt-4 font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
                    {item.title}
                  </h2>

                  <div className="mt-3 text-sm leading-relaxed whitespace-pre-line text-[color:var(--color-muted)]">
                    {item.content}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[color:var(--color-border)] pt-4 text-xs">
                    <span className="font-mono text-[color:var(--color-subtle)]">
                      Editorial Desk · {item.authorName}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
