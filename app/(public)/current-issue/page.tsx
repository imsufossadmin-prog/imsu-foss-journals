import Link from "next/link";
import { Container } from "@/components/ui/container";
import {
  IssueArchiveExplorer,
  type ArchiveIssueGroup,
} from "@/components/public/issue-archive-explorer";
import { prisma } from "@/lib/db/prisma";

export default async function CurrentIssuePage() {
  const publishedArticles = await prisma.article.findMany({
    where: {
      isPublished: true,
      issue: { isClosed: false },
    },
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
  });

  // Group articles by issue for organized shelf & TOC presentation
  const issueGroups: ArchiveIssueGroup[] = [];
  const issueMap = new Map<string, ArchiveIssueGroup>();

  for (const article of publishedArticles) {
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

  return (
    <div className="space-y-12 py-12 sm:py-16">
      <section>
        <Container>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wider text-[color:var(--color-accent)] uppercase">
                Current Publications & Periodicals
              </p>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[color:var(--color-foreground)] sm:text-4xl">
                Current Issues & Publications
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--color-muted)]">
                Explore active peer-reviewed journal issues, interactive Tables
                of Contents, and instant in-page document readers published by
                IMSU FOSS Journals.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/archives"
                className="button-secondary px-4 py-2 text-xs font-semibold"
              >
                Browse All Archives
              </Link>
              <Link
                href="/submit"
                className="button-primary px-4 py-2 text-xs font-semibold"
              >
                Submit Manuscript →
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section>
        <Container>
          {issueGroups.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-12 text-center">
              <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-400">
                Editorial Review in Progress
              </span>
              <h3 className="mt-4 font-serif text-xl font-semibold text-[color:var(--color-foreground)]">
                No active current issue published yet.
              </h3>
              <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                Newly published issues and articles from editors will appear
                here automatically.
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <Link
                  href="/archives"
                  className="button-secondary px-5 py-2 text-xs font-semibold"
                >
                  Browse Past Archives
                </Link>
                <Link
                  href="/submit"
                  className="button-primary px-5 py-2 text-xs font-semibold"
                >
                  Submit Paper →
                </Link>
              </div>
            </div>
          ) : (
            <IssueArchiveExplorer issueGroups={issueGroups} />
          )}
        </Container>
      </section>
    </div>
  );
}
