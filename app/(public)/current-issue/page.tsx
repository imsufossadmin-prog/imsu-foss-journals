import Link from "next/link";

import { Container } from "@/components/ui/container";
import { prisma } from "@/lib/db/prisma";

export default async function CurrentIssuePage() {
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
      <h1 className="text-3xl font-bold text-[color:var(--color-foreground)] sm:text-4xl">
        Current Issue & Recent Publications
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--color-muted)]">
        Official peer-reviewed articles published by IMSU FOSS Journals.
      </p>

      {publishedArticles.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border)] p-12 text-center">
          <p className="text-sm font-medium text-[color:var(--color-muted)]">
            No published articles in the current issue yet.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {publishedArticles.map((article) => (
            <article
              key={article.id}
              className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 transition hover:border-[color:var(--color-accent)]"
            >
              <div className="grid gap-6 md:grid-cols-[180px_1fr]">
                {article.coverImageUrl ? (
                  <Link
                    href={`/articles/${article.slug}`}
                    className="flex h-44 w-full items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-black/40 p-2 md:w-[180px]"
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
                  <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--color-accent)] uppercase">
                    <span>{article.issue.volume.journal.name}</span>
                    <span>·</span>
                    <span>
                      Vol. {article.issue.volume.number}, Issue{" "}
                      {article.issue.number}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-[color:var(--color-foreground)]">
                    <Link
                      href={`/articles/${article.slug}`}
                      className="hover:text-[color:var(--color-accent)] hover:underline"
                    >
                      {article.title}
                    </Link>
                  </h2>
                  {article.authors.length ? (
                    <p className="mt-2 text-xs font-medium text-[color:var(--color-subtle)]">
                      Authors:{" "}
                      {article.authors.map((a) => a.fullName).join(", ")}
                    </p>
                  ) : null}
                  {article.doi ? (
                    <p className="mt-2 text-xs font-semibold text-[color:var(--color-accent)]">
                      DOI: https://doi.org/{article.doi}
                    </p>
                  ) : null}
                  {article.abstract ? (
                    <p className="mt-3 text-xs leading-relaxed text-[color:var(--color-muted)]">
                      {article.abstract}
                    </p>
                  ) : null}
                  <div className="mt-4 flex items-center gap-4 text-xs font-medium text-[color:var(--color-accent)]">
                    <span>
                      Published:{" "}
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString(
                            "en-NG",
                            { day: "numeric", month: "short", year: "numeric" },
                          )
                        : "Recently"}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Container>
  );
}
