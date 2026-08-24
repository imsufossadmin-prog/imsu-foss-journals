import Link from "next/link";

import { requireApplicationArea } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { AdminArticleRowActions } from "./actions-client";

export default async function AdminArticlesDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; success?: string }>;
}) {
  await requireApplicationArea("admin");
  const { q, success } = await searchParams;

  const articles = await prisma.article.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { abstract: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      authors: { orderBy: { position: "asc" } },
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
    },
  });

  return (
    <div className="mx-auto max-w-6xl min-w-0 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-[color:var(--color-accent)] uppercase">
            Platform Content Management
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-4xl">
            Published Articles & Archives
          </h1>
          <p className="mt-1 text-xs text-[color:var(--color-muted)]">
            Manage, unpublish, or delete published content, or upload legacy
            manuscripts directly.
          </p>
        </div>
        <div>
          <Link
            href="/admin/articles/new"
            className="button-primary inline-flex items-center gap-2 text-xs"
          >
            <span>+</span> Upload Legacy Manuscript
          </Link>
        </div>
      </div>

      {success === "published" ? (
        <div className="rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400">
          🎉 Legacy manuscript successfully published to official journal
          archives!
        </div>
      ) : null}

      {/* Directory Table */}
      <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
        <div className="flex items-center justify-between border-b border-[color:var(--color-border)] pb-4">
          <p className="text-sm font-bold text-[color:var(--color-foreground)]">
            All Articles ({articles.length})
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-[color:var(--color-muted)]">
              No published articles found.
            </p>
            <Link
              href="/admin/articles/new"
              className="mt-4 inline-block text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
            >
              Upload a legacy manuscript now →
            </Link>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[color:var(--color-border)]/70">
            {articles.map((article) => (
              <div
                key={article.id}
                className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[color:var(--color-accent)] uppercase">
                    <span>{article.issue.volume.journal.department.name}</span>
                    <span>·</span>
                    <span>
                      Vol. {article.issue.volume.number}, Issue{" "}
                      {article.issue.number}
                    </span>
                    <span className="ml-auto sm:ml-0">
                      {article.isPublished ? (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                          LIVE
                        </span>
                      ) : (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">
                          UNPUBLISHED
                        </span>
                      )}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[color:var(--color-foreground)]">
                    <Link
                      href={`/articles/${article.slug}`}
                      target="_blank"
                      className="hover:text-[color:var(--color-accent)] hover:underline"
                    >
                      {article.title}
                    </Link>
                  </h3>
                  {article.authors.length ? (
                    <p className="text-xs text-[color:var(--color-subtle)]">
                      Authors:{" "}
                      {article.authors.map((a) => a.fullName).join(", ")}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/articles/${article.slug}`}
                    target="_blank"
                    className="button-secondary text-xs"
                  >
                    View Public Page
                  </Link>
                  <AdminArticleRowActions
                    articleId={article.id}
                    isPublished={article.isPublished}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
