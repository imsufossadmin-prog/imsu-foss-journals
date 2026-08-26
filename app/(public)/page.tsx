import Link from "next/link";

import { DisciplinesMarquee } from "@/components/disciplines-marquee";
import { PublicSearchBar } from "@/components/public-search-bar";
import { Container } from "@/components/ui/container";
import { publicSubmissionEntryPath } from "@/lib/auth/submission-entry";
import { prisma } from "@/lib/db/prisma";

export default async function Home() {
  const [publishedArticles, activeJournals] = await Promise.all([
    prisma.article.findMany({
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
    }),
    prisma.journal.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        shortName: true,
        description: true,
        department: { select: { name: true } },
        volumes: {
          select: {
            issues: {
              select: {
                _count: {
                  select: { articles: { where: { isPublished: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const currentIssueArticle = publishedArticles[0] || null;

  const disciplines = activeJournals.map((j) => {
    let articleCount = 0;
    for (const vol of j.volumes) {
      for (const issue of vol.issues) {
        articleCount += issue._count.articles;
      }
    }
    return {
      id: j.id,
      name: j.name,
      slug: j.slug,
      shortName: j.shortName,
      departmentName: j.department.name,
      description: j.description,
      articleCount,
    };
  });

  return (
    <div className="space-y-20 pb-24">
      {/* ── CHAPTER 1: THE STATEMENT & DISCOVERY HERO ── */}
      <section className="relative overflow-hidden pt-8 pb-14 sm:pt-14 sm:pb-20">
        {/* Subtle background ambient gradient */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-1/4 -z-10 size-96 rounded-full bg-[color:var(--color-accent)] opacity-[0.07] blur-3xl"
        />

        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
            {/* Left: Statement & Direct Actions */}
            <div className="space-y-6 text-left">
              {/* Institutional badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] px-3.5 py-1 text-xs font-semibold tracking-wider text-[color:var(--color-accent)] uppercase shadow-xs">
                <span className="size-1.5 animate-pulse rounded-full bg-[color:var(--color-accent)]" />
                <span>IMSU Faculty of Social Sciences</span>
              </div>

              {/* Main Headline */}
              <h1 className="font-serif text-3xl leading-[1.15] font-semibold tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-4xl lg:text-5xl">
                Advancing Social &amp; Behavioural Research in{" "}
                <span className="text-[color:var(--color-accent)]">
                  Africa and Beyond
                </span>
              </h1>

              {/* Subtitle */}
              <p className="font-serif text-base leading-relaxed text-[color:var(--color-muted)] sm:text-lg">
                The official peer-reviewed open-access publishing portal of Imo
                State University. Home to the African Journal of Social and
                Behavioural Sciences (AJSBS) and departmental journals across 7
                social disciplines.
              </p>

              {/* Search & Actions */}
              <div className="space-y-4 pt-2">
                <div className="max-w-xl">
                  <PublicSearchBar />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href={publicSubmissionEntryPath}
                    className="button-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold shadow-md transition-all hover:scale-[1.02]"
                  >
                    <span>Submit Manuscript</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link
                    href="/archives"
                    className="button-secondary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold"
                  >
                    <span>
                      Browse Catalog ({publishedArticles.length} Papers)
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: Modern Academic Highlight Panel */}
            <div className="relative">
              <div className="relative rounded-[var(--radius-lg)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
                {/* Header tag */}
                <div className="flex items-center justify-between border-b border-[color:var(--color-border)] pb-4">
                  <span className="text-[11px] font-bold tracking-wider text-[color:var(--color-accent)] uppercase">
                    Publishing Standards
                  </span>
                  <span className="font-mono text-xs text-[color:var(--color-muted)]">
                    Est. 2009
                  </span>
                </div>

                {/* 3 Interactive pillar highlights */}
                <div className="mt-5 space-y-4">
                  <div className="group rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-3.5 transition hover:border-[color:var(--color-accent)]">
                    <p className="text-xs font-bold text-[color:var(--color-foreground)]">
                      Double-Blind Peer Review
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--color-muted)]">
                      Rigorous blind assessments by subject specialists across
                      all 7 departments.
                    </p>
                  </div>

                  <div className="group rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-3.5 transition hover:border-[color:var(--color-accent)]">
                    <p className="text-xs font-bold text-[color:var(--color-foreground)]">
                      Open Access &amp; CrossRef DOIs
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--color-muted)]">
                      Persistent digital object identifiers and global indexed
                      discoverability.
                    </p>
                  </div>

                  <div className="group rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-3.5 transition hover:border-[color:var(--color-accent)]">
                    <p className="text-xs font-bold text-[color:var(--color-foreground)]">
                      7 Active Academic Disciplines
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--color-muted)]">
                      Psychology, Economics, Political Science, Sociology,
                      Public Admin, CSS, &amp; LIS.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── CHAPTER 2: CURRENT ISSUE SPOTLIGHT (MOST RECENT ARTICLE) ── */}
      {currentIssueArticle ? (
        <section>
          <Container>
            <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-center">
                {/* Left: Article Details */}
                <div>
                  <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] uppercase">
                    <span className="rounded-full bg-[color:var(--color-surface-strong)] px-3 py-1 font-semibold text-[color:var(--color-accent)]">
                      Current Issue
                    </span>
                    <span className="text-[color:var(--color-subtle)]">
                      {currentIssueArticle.issue.volume.journal.department.name}{" "}
                      · Vol. {currentIssueArticle.issue.volume.number}, Issue{" "}
                      {currentIssueArticle.issue.number}
                    </span>
                  </div>

                  <h2 className="mt-4 font-serif text-2xl leading-tight font-semibold text-[color:var(--color-foreground)] sm:text-3xl">
                    <Link
                      href={`/articles/${currentIssueArticle.slug}`}
                      className="transition hover:text-[color:var(--color-accent)]"
                    >
                      {currentIssueArticle.title}
                    </Link>
                  </h2>

                  {currentIssueArticle.authors.length ? (
                    <p className="mt-3 font-mono text-xs text-[color:var(--color-accent)]">
                      By{" "}
                      {currentIssueArticle.authors
                        .map((a) => a.fullName)
                        .join(", ")}
                    </p>
                  ) : null}

                  {currentIssueArticle.abstract ? (
                    <p className="mt-4 line-clamp-3 text-xs leading-relaxed text-[color:var(--color-muted)] sm:text-sm">
                      {currentIssueArticle.abstract}
                    </p>
                  ) : null}

                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <Link
                      href={`/articles/${currentIssueArticle.slug}`}
                      className="button-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold"
                    >
                      <span>Read Full Article & PDF</span>
                      <span>→</span>
                    </Link>
                    {currentIssueArticle.doi ? (
                      <span className="font-mono text-xs text-[color:var(--color-subtle)]">
                        DOI: {currentIssueArticle.doi}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Right: Cover Art or Journal Seal */}
                <div className="flex items-center justify-center">
                  {currentIssueArticle.coverImageUrl ? (
                    <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-black/40 p-2 shadow-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentIssueArticle.coverImageUrl}
                        alt={currentIssueArticle.title}
                        className="max-h-64 w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-56 w-full flex-col justify-between rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
                      <span className="font-mono text-[10px] tracking-widest text-[color:var(--color-accent)] uppercase">
                        Current Issue
                      </span>
                      <p className="font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                        {currentIssueArticle.issue.volume.journal.name}
                      </p>
                      <span className="font-mono text-xs text-[color:var(--color-subtle)]">
                        Faculty of Social Sciences
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {/* ── CHAPTER 3: ACADEMIC DISCIPLINES SLIDING MARQUEE ── */}
      <section>
        <Container>
          <DisciplinesMarquee journals={disciplines} />
        </Container>
      </section>

      {/* ── CHAPTER 4: INSTITUTIONAL TRUST & AUTHOR WORKFLOW ── */}
      <section className="border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)]/40 py-16">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[10px] tracking-widest text-[color:var(--color-accent)] uppercase">
              Author Publishing Pathway
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[color:var(--color-foreground)]">
              Rigorous, Transparent & Streamlined.
            </h2>
            <p className="mt-3 text-sm text-[color:var(--color-muted)]">
              From proposal to double-blind peer review and permanent DOI
              archiving.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
              <span className="font-mono text-xl font-bold text-[color:var(--color-accent)]">
                01
              </span>
              <h3 className="mt-3 font-serif text-base font-semibold text-[color:var(--color-foreground)]">
                Intake & Verification
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                Authors request a submission slot, verify the ₦10,000 review
                fee, and upload formatted Word/PDF manuscripts.
              </p>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
              <span className="font-mono text-xl font-bold text-[color:var(--color-accent)]">
                02
              </span>
              <h3 className="mt-3 font-serif text-base font-semibold text-[color:var(--color-foreground)]">
                Double-Blind Peer Review
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                Anonymised manuscripts are evaluated by at least two discipline
                specialists for methodology, clarity, and originality.
              </p>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
              <span className="font-mono text-xl font-bold text-[color:var(--color-accent)]">
                03
              </span>
              <h3 className="mt-3 font-serif text-base font-semibold text-[color:var(--color-foreground)]">
                Production & Global Indexing
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                Accepted papers receive volume/issue placement and permanent
                DOIs for global scholarly citation.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href={publicSubmissionEntryPath}
              className="button-primary inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold"
            >
              <span>Start Submission Request</span>
              <span>→</span>
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
