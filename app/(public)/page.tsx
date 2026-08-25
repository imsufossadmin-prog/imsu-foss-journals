import Link from "next/link";

import { Container } from "@/components/ui/container";
import { publicSubmissionEntryPath } from "@/lib/auth/submission-entry";
import { siteConfig } from "@/lib/config/site";
import { prisma } from "@/lib/db/prisma";

export default async function Home() {
  const publishedArticles = await prisma.article.findMany({
    where: { isPublished: true },
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

  const featuredArticle = publishedArticles[0] || null;

  return (
    <div className="space-y-16 pb-20">
      {/* Editorial Hero Section (MatheLinux-inspired Layout) */}
      <section className="relative border-b border-[color:var(--color-border)] bg-[color:var(--color-app-background)] py-16 sm:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            {/* Hero Left Column */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/10 px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-[color:var(--color-accent)] uppercase">
                <span>01</span>
                <span>/</span>
                <span>{siteConfig.faculty}</span>
              </div>
              <h1 className="mt-5 font-serif text-4xl leading-[1.08] font-semibold tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-5xl lg:text-6xl">
                Refereed Research <br />
                <span className="text-[color:var(--color-accent)]">
                  for Social Sciences.
                </span>
              </h1>
              <p className="mt-5 max-w-lg font-serif text-lg leading-relaxed text-[color:var(--color-muted)] italic">
                Digital operating center for high-impact peer-reviewed journals
                publishing across empirical, theoretical, and experimental
                social & behavioural sciences.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href={publicSubmissionEntryPath}
                  className="button-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                >
                  <span>Submit Manuscript</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/current-issue"
                  className="button-secondary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                >
                  <span>Explore Catalog ({publishedArticles.length})</span>
                </Link>
              </div>
              <div className="mt-6 flex items-center gap-6 font-mono text-xs text-[color:var(--color-subtle)]">
                <span>• Double-Blind Peer Review</span>
                <span>• Open Access</span>
                <span>• IMSU Owerri</span>
              </div>
            </div>

            {/* Hero Right Column: Featured Manuscript Showcase */}
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 shadow-2xl sm:p-8">
              <div className="flex items-center justify-between border-b border-[color:var(--color-border)] pb-4 font-mono text-[10px] tracking-widest text-[color:var(--color-accent)] uppercase">
                <span>Featured Publication</span>
                <span>
                  {featuredArticle
                    ? `DOI: ${featuredArticle.doi || "Refereed"}`
                    : "Institutional Feature"}
                </span>
              </div>

              {featuredArticle ? (
                <div className="mt-6 space-y-4">
                  {featuredArticle.coverImageUrl ? (
                    <div className="flex h-48 w-full items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-black/30 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={featuredArticle.coverImageUrl}
                        alt={featuredArticle.title}
                        className="max-h-44 w-auto object-contain"
                      />
                    </div>
                  ) : null}
                  <div className="font-mono text-[11px] text-[color:var(--color-subtle)]">
                    {featuredArticle.issue.volume.journal.department.name} —
                    Vol. {featuredArticle.issue.volume.number}, Issue{" "}
                    {featuredArticle.issue.number}
                  </div>
                  <h3 className="font-serif text-xl leading-tight font-semibold text-[color:var(--color-foreground)]">
                    <Link
                      href={`/articles/${featuredArticle.slug}`}
                      className="hover:text-[color:var(--color-accent)]"
                    >
                      {featuredArticle.title}
                    </Link>
                  </h3>
                  {featuredArticle.authors.length ? (
                    <p className="font-mono text-xs text-[color:var(--color-accent)]">
                      By{" "}
                      {featuredArticle.authors
                        .map((a) => a.fullName)
                        .join(", ")}
                    </p>
                  ) : null}
                  {featuredArticle.abstract ? (
                    <p className="line-clamp-3 text-xs leading-relaxed text-[color:var(--color-muted)]">
                      {featuredArticle.abstract}
                    </p>
                  ) : null}
                  <div className="pt-2">
                    <Link
                      href={`/articles/${featuredArticle.slug}`}
                      className="inline-flex items-center gap-2 font-mono text-xs text-[color:var(--color-accent)] hover:underline"
                    >
                      <span>Read Full Article & Access PDF</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <span className="font-mono text-[11px] text-[color:var(--color-subtle)]">
                    Psychology Journal Operations
                  </span>
                  <h3 className="font-serif text-xl font-semibold text-[color:var(--color-foreground)]">
                    African Journal of Social & Behavioural Sciences (AJSBS)
                  </h3>
                  <p className="text-xs leading-relaxed text-[color:var(--color-muted)]">
                    Founded in 2009. Refereed scholarly journal promoting
                    interdisciplinary research in political science, psychology,
                    sociology, financial management, and environmental studies.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/about"
                      className="inline-flex items-center gap-2 font-mono text-xs text-[color:var(--color-accent)] hover:underline"
                    >
                      <span>Learn about the editorial framework</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Horizontal Rail: Published Articles & Department Index */}
      <section>
        <Container>
          <div className="flex items-end justify-between border-b border-[color:var(--color-border)] pb-4">
            <div>
              <p className="font-mono text-[10px] tracking-widest text-[color:var(--color-accent)] uppercase">
                Latest Publications
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-3xl">
                Recent Peer-Reviewed Papers
              </h2>
            </div>
            <Link
              href="/current-issue"
              className="hidden font-mono text-xs text-[color:var(--color-accent)] hover:underline sm:inline-flex"
            >
              View all archives →
            </Link>
          </div>

          {publishedArticles.length === 0 ? (
            <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border)] p-12 text-center">
              <p className="font-mono text-xs text-[color:var(--color-muted)]">
                No published articles indexed yet. New papers approved by
                editors will appear here dynamically.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {publishedArticles.map((article, idx) => (
                <article
                  key={article.id}
                  className="group flex flex-col justify-between rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 transition duration-200 hover:border-[color:var(--color-accent)]"
                >
                  <div>
                    <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-[color:var(--color-accent)] uppercase">
                      <span>
                        0{idx + 1} /{" "}
                        {article.issue.volume.journal.department.name}
                      </span>
                      <span>Vol. {article.issue.volume.number}</span>
                    </div>

                    {article.coverImageUrl ? (
                      <Link
                        href={`/articles/${article.slug}`}
                        className="mt-4 flex h-40 w-full items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-black/40 p-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={article.coverImageUrl}
                          alt={article.title}
                          className="max-h-36 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                      </Link>
                    ) : null}

                    <h3 className="mt-4 font-serif text-lg leading-snug font-semibold text-[color:var(--color-foreground)] group-hover:text-[color:var(--color-accent)]">
                      <Link href={`/articles/${article.slug}`}>
                        {article.title}
                      </Link>
                    </h3>

                    {article.authors.length ? (
                      <p className="mt-2 font-mono text-xs text-[color:var(--color-subtle)]">
                        {article.authors.map((a) => a.fullName).join(", ")}
                      </p>
                    ) : null}

                    {article.abstract ? (
                      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[color:var(--color-muted)]">
                        {article.abstract}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[color:var(--color-border)] pt-4 text-[11px]">
                    <span className="font-mono text-[color:var(--color-subtle)]">
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString(
                            "en-NG",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "Published"}
                    </span>
                    <Link
                      href={`/articles/${article.slug}`}
                      className="font-mono font-semibold text-[color:var(--color-accent)] group-hover:underline"
                    >
                      Read PDF →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* Curriculum / Archives Roadmap List (MatheLinux-inspired) */}
      <section className="border-t border-[color:var(--color-border)] pt-16">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.4fr_1fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="font-mono text-[10px] tracking-widest text-[color:var(--color-accent)] uppercase">
                Institutional Scope
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[color:var(--color-foreground)]">
                Faculty of Social Sciences Journals
              </h2>
              <p className="mt-4 font-serif text-sm text-[color:var(--color-muted)] italic">
                Published by Imo State University (IMSU), Owerri, Nigeria.
              </p>
            </div>

            <ol className="divide-y divide-[color:var(--color-border)] rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]">
              <li className="p-6 transition hover:bg-[color:var(--color-app-background)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-sm font-bold text-[color:var(--color-accent)]">
                    01
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base font-semibold text-[color:var(--color-foreground)]">
                      African Journal of Social and Behavioural Sciences (AJSBS)
                    </h3>
                    <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                      Launched in 2009. Trusted peer-reviewed outlet for
                      political science, psychology, sociology, economics, and
                      environmental management.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[color:var(--color-accent)]">
                    Active →
                  </span>
                </div>
              </li>

              <li className="p-6 transition hover:bg-[color:var(--color-app-background)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-sm font-bold text-[color:var(--color-subtle)]">
                    02
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base font-semibold text-[color:var(--color-foreground)]">
                      Global Journal of Social and Behavioural Research (GJSBR)
                    </h3>
                    <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                      Fostering global perspectives on human behaviour, societal
                      changes, and international development.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[color:var(--color-subtle)]">
                    Reference →
                  </span>
                </div>
              </li>

              <li className="p-6 transition hover:bg-[color:var(--color-app-background)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-sm font-bold text-[color:var(--color-subtle)]">
                    03
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base font-semibold text-[color:var(--color-foreground)]">
                      Nwaebere Journal of Social and Behavioural Research
                      (NJSBR)
                    </h3>
                    <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                      Honouring IMSU heritage through innovative research rooted
                      in African contexts while addressing global academic
                      audiences.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[color:var(--color-subtle)]">
                    Reference →
                  </span>
                </div>
              </li>
            </ol>
          </div>
        </Container>
      </section>
    </div>
  );
}
