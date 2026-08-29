import Link from "next/link";

import { Container } from "@/components/ui/container";
import { TOCDownloadMenu } from "@/components/editorial/toc-download-menu";
import { prisma } from "@/lib/db/prisma";

export default async function CurrentIssuePage() {
  const publishedArticles = await prisma.article.findMany({
    where: { isPublished: true },
    orderBy: [
      { issue: { volume: { year: "desc" } } },
      { issue: { volume: { number: "desc" } } },
      { issue: { number: "desc" } },
      { issueOrder: "asc" },
      { pageStart: "asc" },
      { publishedAt: "desc" },
    ],
    include: {
      issue: {
        include: {
          volume: {
            include: {
              journal: {
                select: {
                  name: true,
                  slug: true,
                  department: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      authors: { orderBy: { position: "asc" } },
    },
  });

  // Group articles by issue for organized TOC presentation
  const issueMap = new Map<
    string,
    {
      issue: (typeof publishedArticles)[0]["issue"];
      articles: typeof publishedArticles;
    }
  >();

  for (const article of publishedArticles) {
    const issueId = article.issue.id;
    if (!issueMap.has(issueId)) {
      issueMap.set(issueId, {
        issue: article.issue,
        articles: [],
      });
    }
    issueMap.get(issueId)!.articles.push(article);
  }

  const issueGroups = Array.from(issueMap.values());

  return (
    <Container className="py-12 sm:py-16">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--color-foreground)] sm:text-4xl">
            Current Issue & Publications
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--color-muted)]">
            Official peer-reviewed articles and Tables of Contents published by
            IMSU FOSS Journals.
          </p>
        </div>
      </div>

      {issueGroups.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border)] p-12 text-center">
          <p className="text-sm font-medium text-[color:var(--color-muted)]">
            No published articles in the current issue yet.
          </p>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {issueGroups.map(({ issue, articles }) => {
            const journal = issue.volume.journal;
            const journalLabel = journal.department?.name ?? journal.name;

            return (
              <section
                key={issue.id}
                className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 sm:p-8"
              >
                {/* Issue Header with TOC Download */}
                <div className="flex flex-col justify-between gap-4 border-b border-[color:var(--color-border)] pb-6 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[color:var(--color-accent)] uppercase">
                      <span>{journalLabel}</span>
                      <span>·</span>
                      <span>
                        Vol. {issue.volume.number}, Issue {issue.number} (
                        {issue.volume.year})
                      </span>
                      {issue.isClosed ? (
                        <span className="rounded bg-slate-500/20 px-2 py-0.5 text-[10px] text-slate-400">
                          CLOSED
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                          CURRENT / OPEN
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-2xl font-bold text-[color:var(--color-foreground)]">
                      {journal.name}
                    </h2>
                    <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
                      Table of Contents ({articles.length}{" "}
                      {articles.length === 1 ? "article" : "articles"})
                    </p>
                  </div>

                  <div className="shrink-0">
                    <TOCDownloadMenu issueId={issue.id} />
                  </div>
                </div>

                {/* Web Table of Contents */}
                <div className="mt-6 divide-y divide-[color:var(--color-border)]/70">
                  {articles.map((article, index) => (
                    <article
                      key={article.id}
                      className="grid gap-6 py-6 first:pt-0 last:pb-0 md:grid-cols-[auto_minmax(0,1fr)_auto]"
                    >
                      <div className="text-sm font-bold text-[color:var(--color-muted)]">
                        {article.issueOrder ?? index + 1}.
                      </div>

                      <div className="min-w-0 space-y-2">
                        <h3 className="text-lg font-bold text-[color:var(--color-foreground)]">
                          <Link
                            href={`/articles/${article.slug}`}
                            className="hover:text-[color:var(--color-accent)] hover:underline"
                          >
                            {article.title}
                          </Link>
                        </h3>

                        {article.authors.length ? (
                          <p className="text-xs font-medium text-[color:var(--color-subtle)]">
                            {article.authors.map((a) => a.fullName).join(", ")}
                          </p>
                        ) : null}

                        {article.doi ? (
                          <p className="text-xs font-semibold text-[color:var(--color-accent)]">
                            DOI: https://doi.org/{article.doi}
                          </p>
                        ) : null}

                        {article.abstract ? (
                          <p className="line-clamp-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                            {article.abstract}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        {article.pageStart ? (
                          <span className="text-xs font-semibold text-[color:var(--color-foreground)]">
                            pp. {article.pageStart}
                            {article.pageEnd ? `–${article.pageEnd}` : ""}
                          </span>
                        ) : null}

                        <a
                          href={`/api/articles/${article.slug}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="button-primary text-xs"
                        >
                          Download PDF
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Container>
  );
}
