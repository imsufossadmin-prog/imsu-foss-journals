import type { ArchiveIssueGroup } from "@/components/public/issue-archive-explorer";
import { getOfficialJournalFullName } from "@/lib/editorial/editorial-board-data";
import { splitAuthorNames } from "@/lib/metadata/scholar";

export function CrawlableArticleDirectory({
  issueGroups,
}: {
  issueGroups: ArchiveIssueGroup[];
}) {
  if (!issueGroups || issueGroups.length === 0) {
    return null;
  }

  const totalArticles = issueGroups.reduce(
    (acc, g) => acc + g.articles.length,
    0,
  );

  return (
    <section
      aria-label="Academic Manuscript Directory"
      data-crawler-index="google-scholar"
      className="mt-12 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 sm:p-8"
    >
      <details className="group" open>
        <summary className="flex cursor-pointer items-center justify-between text-base font-bold text-[color:var(--color-foreground)] transition hover:text-[color:var(--color-accent)]">
          <span className="flex items-center gap-2">
            <span>📚 Complete Academic Manuscript Directory</span>
            <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 py-0.5 font-mono text-xs font-medium text-[color:var(--color-accent)]">
              {totalArticles} Articles across {issueGroups.length} Issues
            </span>
          </span>
          <span className="text-xs font-semibold text-[color:var(--color-subtle)] transition-transform duration-200 group-open:rotate-180">
            ▼
          </span>
        </summary>

        <p className="mt-3 text-xs leading-relaxed text-[color:var(--color-muted)]">
          Comprehensive, crawlable index of published scholarly articles, tables
          of contents, and full-text manuscripts across all volumes and issues.
        </p>

        <div className="mt-6 space-y-8 divide-y divide-[color:var(--color-border)]">
          {issueGroups.map((group) => {
            const journal = group.issue.volume.journal;
            const volNumber = group.issue.volume.number;
            const issueNumber = group.issue.number;
            const year = group.issue.volume.year;

            return (
              <div
                key={`crawler-issue-${group.issue.id}`}
                className="pt-6 first:pt-0"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[color:var(--color-accent)] uppercase">
                  <span>
                    {getOfficialJournalFullName(journal.slug, journal.name)}
                  </span>
                  <span>·</span>
                  <span>
                    Volume {volNumber}, Issue {issueNumber} ({year})
                  </span>
                  <span>·</span>
                  <span className="text-[color:var(--color-muted)]">
                    {group.articles.length}{" "}
                    {group.articles.length === 1 ? "article" : "articles"}
                  </span>
                </div>

                <ol className="mt-3 space-y-2.5 text-xs">
                  {group.articles.map((article, idx) => {
                    const parsedAuthors = splitAuthorNames(
                      article.authors || [],
                    );
                    return (
                      <li
                        key={`crawler-art-${article.id}`}
                        className="flex flex-wrap items-baseline gap-x-2 text-[color:var(--color-foreground)]"
                      >
                        <span className="font-mono text-[color:var(--color-subtle)]">
                          {idx + 1}.
                        </span>
                        <a
                          href={`/articles/${article.slug}`}
                          className="font-semibold text-[color:var(--color-foreground)] hover:text-[color:var(--color-accent)] hover:underline"
                        >
                          {article.title}
                        </a>
                        {parsedAuthors.length > 0 ? (
                          <span className="text-[color:var(--color-muted)]">
                            by {parsedAuthors.join(", ")}
                          </span>
                        ) : null}
                        {article.pageStart && (
                          <span className="font-mono text-[color:var(--color-subtle)]">
                            (pp. {article.pageStart}
                            {article.pageEnd ? `–${article.pageEnd}` : ""})
                          </span>
                        )}
                        {article.doi && (
                          <span className="font-mono text-[color:var(--color-accent)]">
                            DOI: {article.doi}
                          </span>
                        )}
                        <span className="font-mono text-[11px]">
                          [
                          <a
                            href={`/articles/${article.slug}/${article.slug}.pdf`}
                            className="text-[color:var(--color-accent)] hover:underline"
                          >
                            PDF
                          </a>
                          ]
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </details>
    </section>
  );
}
