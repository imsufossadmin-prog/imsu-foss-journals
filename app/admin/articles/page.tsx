import Link from "next/link";

import { requireApplicationArea } from "@/lib/auth/authorization";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { AdminArticleRowActions } from "./actions-client";
import {
  CompactTOCExplorer,
  type CompactIssueData,
} from "./compact-toc-explorer";
import { AdminArticlesSearchBar } from "./search-bar";

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
                { doi: { contains: q, mode: "insensitive" } },
                { keywords: { has: q } },
                {
                  authors: {
                    some: { fullName: { contains: q, mode: "insensitive" } },
                  },
                },
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
                id: true,
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

  const compactIssues: CompactIssueData[] = issues.map((iss) => ({
    id: iss.id,
    number: iss.number,
    title: iss.title,
    isClosed: iss.isClosed,
    publishedArticleCount: iss._count.articles,
    volume: {
      number: iss.volume.number,
      year: iss.volume.year,
      journal: {
        id: iss.volume.journal.id,
        name: iss.volume.journal.name,
        slug: iss.volume.journal.slug,
        departmentName: iss.volume.journal.department?.name ?? null,
      },
    },
  }));

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

      {/* Success Notification Banners */}
      {success === "published" ? (
        <div className="rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400">
          Article published successfully and is now available in Manage
          Articles.
        </div>
      ) : null}

      {success === "updated" ? (
        <div className="rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400">
          Article metadata and files updated successfully.
        </div>
      ) : null}

      {/* Compact Issues & Table of Contents Section */}
      <CompactTOCExplorer issues={compactIssues} />

      {/* Search Bar */}
      <AdminArticlesSearchBar totalCount={articles.length} currentQuery={q} />

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

                <div className="shrink-0 pt-2 sm:pt-0">
                  <AdminArticleRowActions
                    articleId={article.id}
                    articleSlug={article.slug}
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
