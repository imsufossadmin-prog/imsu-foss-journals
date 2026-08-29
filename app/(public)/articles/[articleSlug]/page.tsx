import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { prisma } from "@/lib/db/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ articleSlug: string }>;
}): Promise<Metadata> {
  const { articleSlug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug: articleSlug },
    include: {
      issue: {
        include: {
          volume: {
            include: {
              journal: true,
            },
          },
        },
      },
      authors: { orderBy: { position: "asc" } },
    },
  });

  if (!article || !article.isPublished) return { title: "Article Not Found" };

  const journalName = article.issue.volume.journal.name;
  const pubDate = article.publishedAt
    ? article.publishedAt.toISOString().split("T")[0].replaceAll("-", "/")
    : new Date().toISOString().split("T")[0].replaceAll("-", "/");

  const otherMeta: Record<string, string> = {
    citation_title: article.title,
    citation_publication_date: pubDate,
    citation_journal_title: journalName,
    citation_volume: String(article.issue.volume.number),
    citation_issue: String(article.issue.number),
  };

  if (article.pageStart) otherMeta.citation_firstpage = article.pageStart;
  if (article.pageEnd) otherMeta.citation_lastpage = article.pageEnd;
  if (article.doi) otherMeta.citation_doi = article.doi;

  return {
    title: `${article.title} | ${journalName}`,
    description: article.abstract ?? undefined,
    other: otherMeta,
  };
}

export default async function PublicArticlePage({
  params,
}: {
  params: Promise<{ articleSlug: string }>;
}) {
  const { articleSlug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug: articleSlug },
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

  if (!article || !article.isPublished) {
    notFound();
  }

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-6 text-xs font-semibold text-[color:var(--color-subtle)] uppercase">
          <Link href="/" className="hover:underline">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/current-issue" className="hover:underline">
            {article.issue.volume.journal.name}
          </Link>{" "}
          / Vol. {article.issue.volume.number}, Issue {article.issue.number}
        </nav>

        <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-[color:var(--color-accent)] uppercase">
            <span>
              {article.issue.volume.journal.department?.name ??
                article.issue.volume.journal.name}
            </span>
            <span>·</span>
            <span>
              Volume {article.issue.volume.number}, Issue {article.issue.number}
            </span>
            {article.pageStart ? (
              <>
                <span>·</span>
                <span>
                  Pages {article.pageStart}
                  {article.pageEnd ? `–${article.pageEnd}` : ""}
                </span>
              </>
            ) : null}
          </div>

          <h1 className="mt-4 text-2xl leading-tight font-bold text-[color:var(--color-foreground)] sm:text-4xl">
            {article.title}
          </h1>

          {article.authors.length ? (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-[color:var(--color-subtle)]">
              {article.authors.map((author) => (
                <span key={author.id}>{author.fullName}</span>
              ))}
            </div>
          ) : null}

          {article.doi ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[color:var(--color-surface-strong)] px-3.5 py-2 text-xs font-semibold text-[color:var(--color-accent)]">
              <span>DOI:</span>
              <a
                href={`https://doi.org/${article.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                https://doi.org/{article.doi}
              </a>
            </div>
          ) : null}

          {article.coverImageUrl ? (
            <div className="my-6 flex max-h-[420px] items-center justify-center overflow-hidden rounded-[var(--radius-lg)] bg-black/40 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.coverImageUrl}
                alt={article.title}
                className="max-h-[380px] w-auto rounded-md object-contain"
              />
            </div>
          ) : null}

          <div className="my-6 flex flex-wrap items-center gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
            <div>
              <p className="text-xs font-semibold text-[color:var(--color-foreground)]">
                Full Manuscript Access
              </p>
              <p className="text-[11px] text-[color:var(--color-muted)]">
                Read or download the complete peer-reviewed PDF article.
              </p>
            </div>
            <a
              href={`/api/articles/${article.slug}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="button-primary ml-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
            >
              <span>📄</span> Read & Download PDF
            </a>
          </div>

          {article.abstract ? (
            <div className="mt-6 border-t border-[color:var(--color-border)] pt-6">
              <h2 className="text-sm font-bold tracking-wider text-[color:var(--color-foreground)] uppercase">
                Abstract
              </h2>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-[color:var(--color-muted)]">
                {article.abstract}
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between border-t border-[color:var(--color-border)] pt-4 text-xs text-[color:var(--color-subtle)]">
            <span>
              Published:{" "}
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Recently"}
            </span>
            <span className="font-semibold text-[color:var(--color-accent)]">
              IMSU FOSS Open Access Journal
            </span>
          </div>
        </div>
      </div>
    </Container>
  );
}
