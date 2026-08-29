import Link from "next/link";

import { requireApplicationArea } from "@/lib/auth/authorization";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { AdminArticleRowActions, AdminIssueRowActions } from "./actions-client";

export default async function AdminArticlesDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; success?: string }>;
}) {
  const user = await requireApplicationArea("admin");
  const { q, success } = await searchParams;
  const isSuper = isSuperAdmin(user);
  const allowedJournalIds = isSuper
    ? undefined
    : user.journalRoles
        .filter((jr) => jr.role === "JOURNAL_ADMIN" && jr.journal.isActive)
        .map((jr) => jr.journalId);

  const backHref = isSuper
    ? "/admin"
    : user.journalRoles.find(
          (jr) => jr.role === "JOURNAL_ADMIN" && jr.journal.isActive,
        )
      ? `/admin/${user.journalRoles.find((jr) => jr.role === "JOURNAL_ADMIN" && jr.journal.isActive)!.journal.slug}`
      : "/admin";

  const [articles, issues] = await Promise.all([
    prisma.article.findMany({
      where: {
        ...(allowedJournalIds
          ? { issue: { volume: { journalId: { in: allowedJournalIds } } } }
          : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { abstract: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
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
    }),
    prisma.issue.findMany({
      where: allowedJournalIds
        ? { volume: { journalId: { in: allowedJournalIds } } }
        : undefined,
      orderBy: [
        { volume: { journal: { name: "asc" } } },
        { volume: { year: "desc" } },
        { volume: { number: "desc" } },
        { number: "desc" },
      ],
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
        _count: {
          select: {
            articles: { where: { isPublished: true } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl min-w-0 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Back to Overview */}
      <div>
        <Link
          href={backHref}
          prefetch={true}
          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-foreground)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-[color:var(--color-accent)] uppercase">
            Platform Content Management
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-4xl">
            Published Articles &amp; Issues
          </h1>
          <p className="mt-1 text-xs text-[color:var(--color-muted)]">
            Manage issues, publish Table of Contents, and manage published
            articles in the catalog.
          </p>
        </div>
        <div>
          <Link
            href="/admin/articles/new"
            prefetch={true}
            className="button-primary inline-flex items-center gap-2 text-xs"
          >
            <span>+</span> Direct Publish Manuscript
          </Link>
        </div>
      </div>

      {success === "published" ? (
        <div className="rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400">
          Article published successfully and is now available in Manage
          Articles.
        </div>
      ) : null}

      {/* Issues & Table of Contents Section */}
      <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
        <div className="flex items-center justify-between border-b border-[color:var(--color-border)] pb-4">
          <div>
            <h2 className="text-sm font-bold text-[color:var(--color-foreground)]">
              Journal Issues &amp; Table of Contents ({issues.length})
            </h2>
            <p className="text-xs text-[color:var(--color-muted)]">
              Open/close issues, publish updated TOCs, and download TOC in PDF
              or HTML format.
            </p>
          </div>
        </div>

        {issues.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-[color:var(--color-muted)]">
              No journal issues created yet. Published articles will
              automatically populate issues here.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[color:var(--color-border)]/70">
            {issues.map((issue) => {
              const journal = issue.volume.journal;
              const journalLabel = journal.department?.name ?? journal.name;

              return (
                <div
                  key={issue.id}
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--color-accent)] uppercase">
                      <span>{journalLabel}</span>
                      <span>·</span>
                      <span>
                        Vol. {issue.volume.number} · Issue {issue.number} (
                        {issue.volume.year})
                      </span>
                      <span>
                        {issue.isClosed ? (
                          <span className="rounded bg-slate-500/20 px-2 py-0.5 text-[10px] text-slate-400">
                            CLOSED
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                            OPEN
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-[color:var(--color-subtle)]">
                      {issue._count.articles}{" "}
                      {issue._count.articles === 1 ? "article" : "articles"}{" "}
                      published in this issue
                    </p>
                  </div>

                  <AdminIssueRowActions
                    issueId={issue.id}
                    isClosed={issue.isClosed}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                    <span>
                      {article.issue.volume.journal.department?.name ??
                        article.issue.volume.journal.name}
                    </span>
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
