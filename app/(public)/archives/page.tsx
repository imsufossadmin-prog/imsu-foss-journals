import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PublicSearchBar } from "@/components/public-search-bar";
import { IssueArchiveExplorer } from "@/components/public/issue-archive-explorer";
import { prisma } from "@/lib/db/prisma";

export default async function ArchivesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; journal?: string; status?: string }>;
}) {
  const { q, journal, status } = await searchParams;
  const trimmedQ = q?.trim() || "";
  const isSearchMode = trimmedQ.length > 0;

  const [articles, activeJournals] = await Promise.all([
    prisma.article.findMany({
      where: {
        isPublished: true,
        ...(journal
          ? { issue: { volume: { journal: { slug: journal } } } }
          : {}),
        ...(isSearchMode
          ? {
              OR: [
                { title: { contains: trimmedQ, mode: "insensitive" as const } },
                {
                  abstract: {
                    contains: trimmedQ,
                    mode: "insensitive" as const,
                  },
                },
                { doi: { contains: trimmedQ, mode: "insensitive" as const } },
                {
                  authors: {
                    some: {
                      fullName: {
                        contains: trimmedQ,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: isSearchMode
        ? [{ publishedAt: "desc" }, { title: "asc" }]
        : [
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
                    shortName: true,
                    department: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        authors: { orderBy: { position: "asc" } },
      },
    }),
    prisma.journal.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        shortName: true,
        department: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const activeJournalObj = activeJournals.find((j) => j.slug === journal);

  // Group articles by issue for Issue Collection Mode
  type PublishedArticle = (typeof articles)[0];
  type IssueGroup = {
    issue: PublishedArticle["issue"];
    coverImageUrl: string | null;
    articles: PublishedArticle[];
  };

  const issueGroups: IssueGroup[] = [];
  const issueMap = new Map<string, IssueGroup>();

  if (!isSearchMode) {
    for (const article of articles) {
      const issueId = article.issue.id;
      let group = issueMap.get(issueId);
      if (!group) {
        group = {
          issue: article.issue,
          coverImageUrl: article.coverImageUrl ?? null,
          articles: [],
        };
        issueMap.set(issueId, group);
        issueGroups.push(group);
      } else if (!group.coverImageUrl && article.coverImageUrl) {
        group.coverImageUrl = article.coverImageUrl;
      }
      group.articles.push(article);
    }
  }

  return (
    <div className="space-y-12 py-12 sm:py-16">
      {/* Header */}
      <section>
        <Container>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wider text-[color:var(--color-accent)] uppercase">
                Digital Archives & Periodical Shelf
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-4xl">
                {activeJournalObj
                  ? activeJournalObj.name
                  : "All Published Volumes & Issues"}
              </h1>
              <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                {activeJournalObj
                  ? activeJournalObj.department
                    ? `Department: ${activeJournalObj.department.name}`
                    : "Faculty of Social Sciences Journal"
                  : "Explore peer-reviewed volumes, instant Tables of Contents, and in-page document readers."}
              </p>
            </div>
            <div className="w-full max-w-md">
              <PublicSearchBar />
            </div>
          </div>
        </Container>
      </section>

      {/* Filter Ribbon */}
      <section>
        <Container>
          <div className="flex items-center gap-2 overflow-x-auto border-b border-[color:var(--color-border)] pb-4">
            <Link
              href={
                trimmedQ
                  ? `/archives?q=${encodeURIComponent(trimmedQ)}`
                  : "/archives"
              }
              className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                !journal
                  ? "bg-[color:var(--color-accent)] text-black"
                  : "border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              }`}
            >
              All Journals
            </Link>
            {activeJournals.map((j) => {
              const href = trimmedQ
                ? `/archives?journal=${j.slug}&q=${encodeURIComponent(trimmedQ)}`
                : `/archives?journal=${j.slug}`;
              return (
                <Link
                  key={j.id}
                  href={href}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                    journal === j.slug
                      ? "bg-[color:var(--color-accent)] text-black"
                      : "border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                  }`}
                >
                  {j.shortName || j.name}
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Content Section */}
      <section>
        <Container>
          {articles.length === 0 ? (
            /* Empty State */
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-12 text-center">
              <span className="inline-block rounded-full bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-300">
                {isSearchMode
                  ? "No Search Matches"
                  : status === "upcoming" || activeJournalObj
                    ? "Volume in Preparation / Coming Soon"
                    : "No Published Issues Yet"}
              </span>
              <h3 className="mt-4 font-serif text-xl font-semibold text-[color:var(--color-foreground)]">
                {isSearchMode
                  ? `No articles found matching "${trimmedQ}"`
                  : activeJournalObj
                    ? `Papers for ${activeJournalObj.name} are currently under peer review.`
                    : "No published issues found in this selection."}
              </h3>
              <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                {isSearchMode
                  ? "Try searching with different keywords, author names, or title phrases."
                  : "Newly accepted and published articles from editors will appear here automatically."}
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <Link
                  href="/archives"
                  className="button-secondary inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold"
                >
                  Clear Filters & Show All
                </Link>
                <Link
                  href="/submit"
                  className="button-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold"
                >
                  Submit Paper to this Journal →
                </Link>
              </div>
            </div>
          ) : isSearchMode ? (
            /* Mode B: Direct Search Results */
            <div className="space-y-6">
              <div className="flex flex-col gap-3 border-b border-[color:var(--color-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-mono text-xs text-[color:var(--color-subtle)]">
                  Showing{" "}
                  <span className="font-bold text-[color:var(--color-accent)]">
                    {articles.length}
                  </span>{" "}
                  matching {articles.length === 1 ? "article" : "articles"} for
                  &ldquo;
                  <span className="text-[color:var(--color-foreground)]">
                    {trimmedQ}
                  </span>
                  &rdquo;
                </div>
                <Link
                  href={journal ? `/archives?journal=${journal}` : "/archives"}
                  className="button-secondary inline-flex items-center gap-1.5 self-start px-3 py-1.5 text-xs font-semibold sm:self-auto"
                >
                  <span>✕</span>
                  <span>Clear Search & Browse Issue Shelf</span>
                </Link>
              </div>

              {articles.map((article) => (
                <article
                  key={article.id}
                  className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 transition hover:border-[color:var(--color-accent)]"
                >
                  <div className="grid gap-6 md:grid-cols-[160px_1fr]">
                    {article.coverImageUrl ? (
                      <Link
                        href={`/articles/${article.slug}`}
                        className="flex h-44 w-full items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-black/40 p-2 md:w-[160px]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={article.coverImageUrl}
                          alt={article.title}
                          className="max-h-40 w-auto object-contain transition-transform duration-300 hover:scale-105"
                        />
                      </Link>
                    ) : null}
                    <div>
                      <div className="flex items-center gap-2 font-mono text-xs font-semibold text-[color:var(--color-accent)] uppercase">
                        <span>{article.issue.volume.journal.name}</span>
                        <span>·</span>
                        <span>
                          Vol. {article.issue.volume.number}, Issue{" "}
                          {article.issue.number} ({article.issue.volume.year})
                        </span>
                      </div>
                      <h2 className="mt-2 font-serif text-xl font-semibold text-[color:var(--color-foreground)]">
                        <Link
                          href={`/articles/${article.slug}`}
                          className="hover:text-[color:var(--color-accent)]"
                        >
                          {article.title}
                        </Link>
                      </h2>
                      {article.authors.length ? (
                        <p className="mt-2 font-mono text-xs text-[color:var(--color-subtle)]">
                          Authors:{" "}
                          {article.authors.map((a) => a.fullName).join(", ")}
                        </p>
                      ) : null}
                      {article.doi ? (
                        <p className="mt-2 font-mono text-xs text-[color:var(--color-accent)]">
                          DOI: https://doi.org/{article.doi}
                        </p>
                      ) : null}
                      {article.abstract ? (
                        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[color:var(--color-muted)]">
                          {article.abstract}
                        </p>
                      ) : null}
                      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-medium">
                        <Link
                          href={`/articles/${article.slug}`}
                          className="button-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
                        >
                          <span>Read Full Article</span>
                          <span>→</span>
                        </Link>
                        <a
                          href={`/api/articles/${article.slug}/pdf`}
                          download
                          className="button-secondary inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold"
                        >
                          <span>Download PDF</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            /* Mode A: Issue Periodicals Shelf Grid with Instant TOC & PDF Modal */
            <IssueArchiveExplorer issueGroups={issueGroups} />
          )}
        </Container>
      </section>
    </div>
  );
}
