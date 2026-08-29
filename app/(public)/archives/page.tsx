import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PublicSearchBar } from "@/components/public-search-bar";
import { prisma } from "@/lib/db/prisma";

export default async function ArchivesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; journal?: string; status?: string }>;
}) {
  const { q, journal, status } = await searchParams;

  const [articles, activeJournals] = await Promise.all([
    prisma.article.findMany({
      where: {
        isPublished: true,
        ...(journal
          ? { issue: { volume: { journal: { slug: journal } } } }
          : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { abstract: { contains: q, mode: "insensitive" as const } },
                { doi: { contains: q, mode: "insensitive" as const } },
                {
                  authors: {
                    some: {
                      fullName: { contains: q, mode: "insensitive" as const },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { publishedAt: "desc" },
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

  return (
    <div className="space-y-12 py-12 sm:py-16">
      {/* Header */}
      <section>
        <Container>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wider text-[color:var(--color-accent)] uppercase">
                Digital Archives & Catalogues
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-4xl">
                {activeJournalObj
                  ? activeJournalObj.name
                  : "All Published Manuscripts"}
              </h1>
              <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                {activeJournalObj
                  ? activeJournalObj.department
                    ? `Department: ${activeJournalObj.department.name}`
                    : "Faculty of Social Sciences Journal"
                  : "Search across all volumes, issues, and peer-reviewed journals."}
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
              href="/archives"
              className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                !journal
                  ? "bg-[color:var(--color-accent)] text-black"
                  : "border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              }`}
            >
              All Journals
            </Link>
            {activeJournals.map((j) => (
              <Link
                key={j.id}
                href={`/archives?journal=${j.slug}`}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                  journal === j.slug
                    ? "bg-[color:var(--color-accent)] text-black"
                    : "border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                }`}
              >
                {j.shortName || j.name}
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Results Section */}
      <section>
        <Container>
          {articles.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-12 text-center">
              <span className="inline-block rounded-full bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-300">
                {status === "upcoming" || activeJournalObj
                  ? "Volume in Preparation / Coming Soon"
                  : "No Articles Match Your Search"}
              </span>
              <h3 className="mt-4 font-serif text-xl font-semibold text-[color:var(--color-foreground)]">
                {activeJournalObj
                  ? `Papers for ${activeJournalObj.name} are currently under peer review.`
                  : "No published articles found in this selection."}
              </h3>
              <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                Newly accepted and published articles from editors will appear
                here automatically.
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
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between font-mono text-xs text-[color:var(--color-subtle)]">
                <span>
                  Showing {articles.length} peer-reviewed{" "}
                  {articles.length === 1 ? "article" : "articles"}
                </span>
                {q ? <span>Filtered by: &ldquo;{q}&rdquo;</span> : null}
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
                          {article.issue.number}
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
                      <div className="mt-5 flex items-center gap-4 text-xs font-medium">
                        <Link
                          href={`/articles/${article.slug}`}
                          className="button-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
                        >
                          <span>Read Full Article & PDF</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}
