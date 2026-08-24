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

  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.14em] text-[color:var(--color-accent)] uppercase">
          {siteConfig.faculty}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-[color:var(--color-foreground)] sm:text-5xl">
          {siteConfig.name}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--color-muted)]">
          Digital operating center & official publishing platform for the{" "}
          {siteConfig.faculty}, {siteConfig.institution}.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/current-issue"
            className="inline-flex items-center justify-center border border-[color:var(--color-accent)] bg-[color:var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-[color:var(--color-accent)]"
          >
            Browse Published Articles ({publishedArticles.length})
          </Link>
          <Link
            href={publicSubmissionEntryPath}
            className="inline-flex items-center justify-center border border-[color:var(--color-border)] px-5 py-2.5 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
          >
            Start Submission Request
          </Link>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-xl font-bold tracking-tight text-[color:var(--color-foreground)]">
          Latest Published Articles
        </h2>
        {publishedArticles.length === 0 ? (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border)] p-8 text-center">
            <p className="text-sm font-medium text-[color:var(--color-muted)]">
              No published articles yet. When an administrator publishes an
              approved manuscript, it will appear here immediately.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publishedArticles.map((article) => (
              <article
                key={article.id}
                className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5 transition hover:border-[color:var(--color-accent)]"
              >
                <div>
                  {article.coverImageUrl ? (
                    <Link
                      href={`/articles/${article.slug}`}
                      className="mb-4 flex h-48 w-full items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-black/40 p-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={article.coverImageUrl}
                        alt={article.title}
                        className="max-h-44 w-auto object-contain transition-transform duration-300 hover:scale-105"
                      />
                    </Link>
                  ) : null}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[color:var(--color-accent)] uppercase">
                    <span>{article.issue.volume.journal.department.name}</span>
                    <span>
                      Vol. {article.issue.volume.number} · Issue{" "}
                      {article.issue.number}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base leading-snug font-semibold text-[color:var(--color-foreground)]">
                    <Link
                      href={`/articles/${article.slug}`}
                      className="hover:text-[color:var(--color-accent)] hover:underline"
                    >
                      {article.title}
                    </Link>
                  </h3>
                  {article.authors.length ? (
                    <p className="mt-2 text-xs font-medium text-[color:var(--color-subtle)]">
                      By {article.authors.map((a) => a.fullName).join(", ")}
                    </p>
                  ) : null}
                  {article.doi ? (
                    <p className="mt-2 text-[11px] font-semibold text-[color:var(--color-accent)]">
                      DOI: https://doi.org/{article.doi}
                    </p>
                  ) : null}
                  {article.abstract ? (
                    <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[color:var(--color-muted)]">
                      {article.abstract}
                    </p>
                  ) : null}
                </div>
                <div className="mt-5 border-t border-[color:var(--color-border)] pt-3 text-[11px] text-[color:var(--color-subtle)]">
                  Published{" "}
                  {article.publishedAt
                    ? new Date(article.publishedAt).toLocaleDateString(
                        "en-NG",
                        { day: "numeric", month: "short", year: "numeric" },
                      )
                    : "Recently"}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
