import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireApplicationArea } from "@/lib/auth/authorization";
import { hasJournalRole, isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { AdminArticleEditForm } from "./form";

export default async function AdminEditArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const user = await requireApplicationArea("admin");
  const { articleId } = await params;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      authors: { orderBy: { position: "asc" } },
      issue: {
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
        },
      },
      files: {
        where: { type: "PUBLISHED_PDF" },
        include: { storedFile: true },
        take: 1,
      },
    },
  });

  if (!article) {
    notFound();
  }

  const journal = article.issue.volume.journal;

  if (
    !isSuperAdmin(user) &&
    !hasJournalRole(user, journal.id, "JOURNAL_ADMIN")
  ) {
    redirect("/unauthorized");
  }

  const editData = {
    id: article.id,
    title: article.title,
    abstract: article.abstract,
    keywords: article.keywords,
    doi: article.doi,
    pageStart: article.pageStart,
    pageEnd: article.pageEnd,
    issueOrder: article.issueOrder,
    publishedAt: article.publishedAt,
    coverImageUrl: article.coverImageUrl,
    issue: {
      number: article.issue.number,
      volume: {
        number: article.issue.volume.number,
        year: article.issue.volume.year,
        journal: {
          name: journal.name,
          slug: journal.slug,
          departmentName: journal.department?.name || null,
        },
      },
    },
    authors: article.authors.map((a) => ({
      id: a.id,
      fullName: a.fullName,
      affiliation: a.affiliation,
      email: a.email,
      position: a.position,
    })),
    existingPdfFileName: article.files[0]?.storedFile?.originalFileName || null,
  };

  return (
    <div className="mx-auto max-w-4xl min-w-0 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Back to Articles */}
      <div>
        <Link
          href="/admin/articles"
          prefetch={true}
          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-foreground)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
        >
          ← Back to Articles Directory
        </Link>
      </div>

      {/* Page Header */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.14em] text-[color:var(--color-accent)] uppercase">
          Manuscript Metadata &amp; Content
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-4xl">
          Edit Published Article
        </h1>
        <p className="mt-1 text-xs text-[color:var(--color-muted)]">
          Update article metadata, authors, DOI, pagination, or replace
          manuscript binary files.
        </p>
      </div>

      {/* Form Container */}
      <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 sm:p-8">
        <AdminArticleEditForm article={editData} />
      </div>
    </div>
  );
}
