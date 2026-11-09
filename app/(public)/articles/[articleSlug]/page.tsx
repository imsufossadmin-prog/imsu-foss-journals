import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { CitationBlock } from "@/components/articles/citation-block";
import { type CitationArticleMetadata } from "@/lib/citations/generator";
import { prisma } from "@/lib/db/prisma";
import { getOfficialJournalFullName } from "@/lib/editorial/editorial-board-data";
import { formatLongDate } from "@/lib/formatting/dates";
import { getOrcidUrl } from "@/lib/utils/orcid";

import { buildGoogleScholarMetadata } from "@/lib/metadata/scholar";

export const dynamic = "force-dynamic";

const getArticleBySlug = cache(async (articleSlug: string) => {
  return prisma.article.findUnique({
    where: { slug: articleSlug },
    include: {
      issue: {
        include: {
          volume: {
            include: {
              journal: {
                include: {
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
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ articleSlug: string }>;
}): Promise<Metadata> {
  const { articleSlug } = await params;
  const article = await getArticleBySlug(articleSlug);

  if (!article || !article.isPublished) return { title: "Article Not Found" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://imsufoss.com";
  const scholarMeta = buildGoogleScholarMetadata(article, baseUrl);

  return {
    title: scholarMeta.title,
    description: scholarMeta.description,
    alternates: {
      canonical: `/articles/${article.slug}`,
    },
    other: scholarMeta.other,
  };
}

export default async function PublicArticlePage({
  params,
}: {
  params: Promise<{ articleSlug: string }>;
}) {
  const { articleSlug } = await params;
  const article = await getArticleBySlug(articleSlug);

  if (!article || !article.isPublished) {
    notFound();
  }

  const distinctAffiliations = Array.from(
    new Set(
      article.authors
        .map((a) => a.affiliation?.trim())
        .filter((aff): aff is string => Boolean(aff)),
    ),
  );

  const officialJournalName = getOfficialJournalFullName(
    article.issue.volume.journal.slug,
    article.issue.volume.journal.name,
  );
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://imsufoss.com";
  const citationMeta: CitationArticleMetadata = {
    title: article.title,
    journalName: officialJournalName,
    journalSlug: article.issue.volume.journal.slug,
    volume: article.issue.volume.number,
    issue: article.issue.number,
    year: article.issue.volume.year,
    publishedAt: article.publishedAt,
    pageStart: article.pageStart,
    pageEnd: article.pageEnd,
    doi: article.doi,
    canonicalUrl: `${baseUrl}/articles/${article.slug}`,
    authors: article.authors.map((a) => ({
      fullName: a.fullName,
      affiliation: a.affiliation,
      orcid: a.orcid,
      position: a.position,
    })),
  };

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-6 text-xs font-semibold text-[color:var(--color-subtle)] uppercase">
          <Link href="/" className="hover:underline">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/current-issue" className="hover:underline">
            {officialJournalName}
          </Link>{" "}
          / Vol. {article.issue.volume.number}, Issue {article.issue.number}
        </nav>

        <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-[color:var(--color-accent)] uppercase">
            <span>{officialJournalName}</span>
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
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-semibold text-[color:var(--color-subtle)]">
                {article.authors.map((author) => {
                  const orcidUrl = getOrcidUrl(author.orcid);
                  const affIndex = author.affiliation?.trim()
                    ? distinctAffiliations.indexOf(author.affiliation.trim())
                    : -1;

                  return (
                    <span
                      key={author.id}
                      className="inline-flex items-center gap-1.5"
                    >
                      <span className="text-[color:var(--color-foreground)]">
                        {author.fullName}
                      </span>
                      {affIndex !== -1 ? (
                        <sup
                          className="text-[10px] font-bold text-[color:var(--color-accent)]"
                          title={author.affiliation || undefined}
                        >
                          {affIndex + 1}
                        </sup>
                      ) : null}
                      {orcidUrl ? (
                        <a
                          href={orcidUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`ORCID profile for ${author.fullName}`}
                          title={`ORCID iD: ${author.orcid}`}
                          className="inline-flex items-center text-[#a6ce39] transition hover:opacity-80"
                        >
                          <svg
                            className="size-3.5"
                            viewBox="0 0 256 256"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              d="M256 128c0 70.7-57.3 128-128 128S0 198.7 0 128 57.3 0 128 0s128 57.3 128 128z"
                              fill="#A6CE39"
                            />
                            <path
                              d="M86.3 186.2H70.9V79.1h15.4v107.1zM78.6 65.8c-5.4 0-9.8-4.4-9.8-9.8s4.4-9.8 9.8-9.8 9.8 4.4 9.8 9.8-4.4 9.8-9.8 9.8zM196.4 132.8c0 30.6-18.7 53.4-53.1 53.4h-35V79.1h36.2c33.3 0 51.9 22.8 51.9 53.7zm-15.5 0c0-22.3-11.4-38.6-36.4-38.6h-21.1v77.2h21.1c25.4 0 36.4-16.3 36.4-38.6z"
                              fill="#FFF"
                            />
                          </svg>
                        </a>
                      ) : null}
                    </span>
                  );
                })}
              </div>

              {distinctAffiliations.length > 0 ? (
                <div className="space-y-0.5 pt-1 text-xs text-[color:var(--color-muted)]">
                  {distinctAffiliations.map((aff, index) => (
                    <div key={index} className="flex items-start gap-1.5">
                      <span className="font-semibold text-[color:var(--color-accent)]">
                        {index + 1}
                      </span>
                      <span>{aff}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {article.doi ? (
            <div className="mt-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs text-[color:var(--color-muted)]">
              <span className="font-semibold text-[color:var(--color-foreground)]">
                DOI:
              </span>
              <a
                href={`https://doi.org/${article.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-[color:var(--color-accent)] hover:underline"
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
              href={`/articles/${article.slug}/${article.slug}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="button-primary ml-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
            >
              <span>Read & Download PDF</span>
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

          {/* Citation Generator */}
          <CitationBlock metadata={citationMeta} />

          <div className="mt-8 flex flex-col gap-2 border-t border-[color:var(--color-border)] pt-4 text-xs text-[color:var(--color-subtle)] sm:flex-row sm:items-center sm:justify-between">
            <span suppressHydrationWarning>
              Published:{" "}
              {article.publishedAt
                ? formatLongDate(article.publishedAt)
                : "Recently"}
            </span>
            <span>IMSU FOSS Open Access Academic Journal</span>
          </div>
        </div>
      </div>
    </Container>
  );
}
