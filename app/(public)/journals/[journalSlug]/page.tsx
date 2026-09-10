import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { prisma } from "@/lib/db/prisma";
import {
  getJournalDbSlugs,
  resolveCanonicalJournalSlug,
} from "@/lib/editorial/editorial-board-data";
import {
  getJournalEditorialBoard,
  getJournalMetadataWithOverrides,
} from "@/lib/editorial/editorial-board-store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ journalSlug: string }>;
}): Promise<Metadata> {
  const { journalSlug } = await params;
  const canonical = resolveCanonicalJournalSlug(journalSlug);
  const meta = await getJournalMetadataWithOverrides(canonical);
  if (!meta) return { title: "Journal Not Found" };

  return {
    title: `${meta.title} (${meta.shortName}) | IMSU FOSS Journals`,
    description: meta.aimsAndScope,
  };
}

export default async function JournalLandingPage({
  params,
}: {
  params: Promise<{ journalSlug: string }>;
}) {
  const { journalSlug } = await params;
  const canonical = resolveCanonicalJournalSlug(journalSlug);
  const meta = await getJournalMetadataWithOverrides(canonical);

  if (!meta) {
    notFound();
  }

  const dbSlugs = getJournalDbSlugs(canonical);

  // Fetch editorial board and published articles concurrently (relation join)
  const [boardMembers, publishedArticles, journalVolumes] = await Promise.all([
    getJournalEditorialBoard(canonical),
    prisma.article.findMany({
      where: {
        isPublished: true,
        issue: {
          volume: {
            journal: {
              slug: { in: dbSlugs },
            },
          },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: {
        issue: {
          include: {
            volume: true,
          },
        },
        authors: { orderBy: { position: "asc" } },
      },
    }),
    prisma.volume.findMany({
      where: {
        journal: {
          slug: { in: dbSlugs },
        },
      },
      orderBy: [{ year: "desc" }, { number: "desc" }],
      include: {
        issues: {
          where: { isPublished: true },
          include: {
            _count: { select: { articles: { where: { isPublished: true } } } },
          },
        },
      },
    }),
  ]);

  // Group board members by category
  const chiefEditor = boardMembers.find((m) => m.category === "CHIEF_EDITOR");
  const deputyEditor = boardMembers.find((m) => m.category === "DEPUTY_EDITOR");
  const managingEditor = boardMembers.find(
    (m) => m.category === "MANAGING_EDITOR",
  );
  const associateEditors = boardMembers.filter(
    (m) => m.category === "ASSOCIATE_EDITOR",
  );
  const boardMemberList = boardMembers.filter(
    (m) => m.category === "BOARD_MEMBER",
  );
  const consultingEditors = boardMembers.filter(
    (m) => m.category === "CONSULTING_EDITOR",
  );
  const advisoryBoard = boardMembers.filter(
    (m) => m.category === "ADVISORY_BOARD",
  );

  const submissionHref = `/author?journal=${meta.slug}`;

  return (
    <div className="space-y-16 pb-24">
      {/* ── HERO BANNER ── */}
      <section className="relative overflow-hidden border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-1/4 -z-10 size-96 rounded-full bg-[color:var(--color-accent)] opacity-[0.08] blur-3xl"
        />

        <Container>
          <div className="max-w-4xl space-y-6">
            {/* Breadcrumb & Badges */}
            <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
              <Link
                href="/"
                className="text-[color:var(--color-subtle)] transition hover:text-[color:var(--color-accent)]"
              >
                Home
              </Link>
              <span className="text-[color:var(--color-border)]">/</span>
              <Link
                href="/archives"
                className="text-[color:var(--color-subtle)] transition hover:text-[color:var(--color-accent)]"
              >
                Journals
              </Link>
              <span className="text-[color:var(--color-border)]">/</span>
              <span className="font-semibold text-[color:var(--color-accent)]">
                {meta.shortName}
              </span>
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-3 py-1 font-mono text-xs font-bold text-[color:var(--color-accent)] uppercase">
                <span>{meta.shortName}</span>
                <span>·</span>
                <span>{meta.department}</span>
              </div>

              <h1 className="font-serif text-3xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-5xl">
                {meta.title}
              </h1>

              <p className="font-serif text-base text-[color:var(--color-muted)] sm:text-lg">
                {meta.faculty}, {meta.institution}
              </p>
            </div>

            {/* ISSN & Attributes Bar */}
            {meta.showMetadataOnHomepage &&
            (meta.issnPrint ||
              meta.issnOnline ||
              meta.frequency ||
              meta.referencingStyle) ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-[color:var(--color-border)] py-2.5 font-mono text-xs text-[color:var(--color-muted)]">
                {meta.issnPrint ? (
                  <span>
                    Print ISSN:{" "}
                    <strong className="font-semibold text-[color:var(--color-foreground)]">
                      {meta.issnPrint}
                    </strong>
                  </span>
                ) : null}
                {meta.issnOnline ? (
                  <span>
                    Online eISSN:{" "}
                    <strong className="font-semibold text-[color:var(--color-foreground)]">
                      {meta.issnOnline}
                    </strong>
                  </span>
                ) : null}
                {meta.frequency ? (
                  <span>
                    Frequency:{" "}
                    <strong className="font-semibold text-[color:var(--color-foreground)]">
                      {meta.frequency}
                    </strong>
                  </span>
                ) : null}
                {meta.referencingStyle ? (
                  <span>
                    Standard:{" "}
                    <strong className="font-semibold text-[color:var(--color-foreground)]">
                      {meta.referencingStyle}
                    </strong>
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={submissionHref}
                className="button-primary inline-flex items-center gap-2 px-6 py-3 text-xs font-semibold shadow-md transition-transform hover:scale-[1.02]"
              >
                <span>Submit to this Journal</span>
                <span>→</span>
              </Link>
              <Link
                href={`/archives?journal=${meta.slug}`}
                className="button-secondary inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold"
              >
                <span>Browse {meta.shortName} Catalog</span>
              </Link>
              <Link
                href={`/apply-reviewer?journal=${meta.slug}`}
                className="button-secondary inline-flex items-center gap-1.5 px-4 py-3 text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              >
                <span>Apply as Reviewer</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ── SECTION 1: AIMS & SCOPE ── */}
      <section>
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="border-b border-[color:var(--color-border)] pb-3">
                <p className="font-mono text-xs font-semibold text-[color:var(--color-accent)] uppercase">
                  Journal Focus & Policy
                </p>
                <h2 className="mt-1 font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
                  Aims & Scope
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-[color:var(--color-muted)]">
                {meta.aimsAndScope}
              </p>

              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4">
                  <p className="font-mono text-xs font-bold text-[color:var(--color-foreground)]">
                    Double-Blind Peer Review
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                    {meta.peerReviewPolicy}
                  </p>
                </div>
                <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4">
                  <p className="font-mono text-xs font-bold text-[color:var(--color-foreground)]">
                    Open Access & Indexing
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                    CrossRef permanent DOIs, Highwire Press / Google Scholar
                    indexing.
                  </p>
                </div>
              </div>
            </div>

            {/* Author Quick Info Card */}
            <div className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 sm:p-8">
              <div>
                <p className="font-mono text-xs font-semibold text-[color:var(--color-accent)] uppercase">
                  Submission Summary
                </p>
                <h3 className="mt-2 font-serif text-xl font-semibold text-[color:var(--color-foreground)]">
                  Publishing Schedule & Fees
                </h3>
                <dl className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between border-b border-[color:var(--color-border)] pb-2">
                    <dt className="text-[color:var(--color-subtle)]">
                      Review Fee (Nigerian Authors):
                    </dt>
                    <dd className="font-bold text-[color:var(--color-accent)]">
                      ₦10,000
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-[color:var(--color-border)] pb-2">
                    <dt className="text-[color:var(--color-subtle)]">
                      Publication Fee (Upon Acceptance):
                    </dt>
                    <dd className="font-bold text-[color:var(--color-foreground)]">
                      ₦25,000
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-[color:var(--color-border)] pb-2">
                    <dt className="text-[color:var(--color-subtle)]">
                      Foreign Author Fee (All-inclusive):
                    </dt>
                    <dd className="font-bold text-[color:var(--color-accent)]">
                      $50
                    </dd>
                  </div>
                  <div className="flex justify-between pb-1">
                    <dt className="text-[color:var(--color-subtle)]">
                      Manuscript Format:
                    </dt>
                    <dd className="font-medium text-[color:var(--color-foreground)]">
                      MS Word (.docx), APA 7th
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 border-t border-[color:var(--color-border)] pt-4">
                <Link
                  href={submissionHref}
                  className="button-primary inline-flex w-full items-center justify-center gap-2 py-2.5 text-xs font-semibold"
                >
                  <span>Start Submission Request</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── SECTION 2: EDITORIAL BOARD ── */}
      <section className="border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)]/40 py-12">
        <Container>
          <div className="flex flex-col gap-3 border-b border-[color:var(--color-border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold text-[color:var(--color-accent)] uppercase">
                Governance & Leadership
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-[color:var(--color-foreground)] sm:text-3xl">
                Editorial Board
              </h2>
            </div>
            <Link
              href="/editorial-board"
              className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
            >
              View Full Faculty Board →
            </Link>
          </div>

          {/* Principal Officers */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {chiefEditor ? (
              <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-accent)]/40 bg-[color:var(--color-surface-raised)] p-6 shadow-sm">
                <span className="rounded bg-[color:var(--color-surface-strong)] px-2.5 py-1 font-mono text-[10px] font-bold text-[color:var(--color-accent)] uppercase">
                  {chiefEditor.role}
                </span>
                <h3 className="mt-3 font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                  {chiefEditor.name}
                </h3>
                <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                  {chiefEditor.affiliation}
                </p>
              </div>
            ) : null}

            {deputyEditor ? (
              <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
                <span className="rounded bg-[color:var(--color-surface)] px-2.5 py-1 font-mono text-[10px] font-bold text-[color:var(--color-accent)] uppercase">
                  {deputyEditor.role}
                </span>
                <h3 className="mt-3 font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                  {deputyEditor.name}
                </h3>
                <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                  {deputyEditor.affiliation}
                </p>
              </div>
            ) : null}

            {managingEditor ? (
              <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 sm:col-span-2 lg:col-span-1">
                <span className="rounded bg-[color:var(--color-surface)] px-2.5 py-1 font-mono text-[10px] font-bold text-[color:var(--color-accent)] uppercase">
                  {managingEditor.role}
                </span>
                <h3 className="mt-3 font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                  {managingEditor.name}
                </h3>
                <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                  {managingEditor.affiliation}
                </p>
              </div>
            ) : null}
          </div>

          {/* Associate Editors / Board Members */}
          {associateEditors.length > 0 || boardMemberList.length > 0 ? (
            <div className="mt-10">
              <h3 className="font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                {associateEditors.length > 0
                  ? "Associate Editors & Board Members"
                  : "Editorial Board Members"}
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...associateEditors, ...boardMemberList].map((member) => (
                  <div
                    key={member.id}
                    className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-[color:var(--color-accent)]" />
                      <p className="font-serif text-sm font-semibold text-[color:var(--color-foreground)]">
                        {member.name}
                      </p>
                    </div>
                    <p className="mt-1 pl-3.5 text-xs text-[color:var(--color-muted)]">
                      {member.affiliation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Consulting Editors / Advisory Council */}
          {consultingEditors.length > 0 || advisoryBoard.length > 0 ? (
            <div className="mt-10">
              <h3 className="font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                {consultingEditors.length > 0
                  ? "Consulting Editors"
                  : "Advisory Council"}
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...consultingEditors, ...advisoryBoard].map((member) => (
                  <div
                    key={member.id}
                    className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
                  >
                    <p className="font-serif text-sm font-semibold text-[color:var(--color-foreground)]">
                      {member.name}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                      {member.affiliation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Container>
      </section>

      {/* ── SECTION 3: CURRENT ISSUE & ARTICLES ── */}
      <section>
        <Container>
          <div className="flex flex-col gap-3 border-b border-[color:var(--color-border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold text-[color:var(--color-accent)] uppercase">
                Latest Publications
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-[color:var(--color-foreground)] sm:text-3xl">
                Recent Papers &amp; Issues
              </h2>
            </div>
            <Link
              href={`/archives?journal=${meta.slug}`}
              className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
            >
              Browse Full {meta.shortName} Archive →
            </Link>
          </div>

          {publishedArticles.length > 0 ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {publishedArticles.map((article) => (
                <article
                  key={article.id}
                  className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 transition hover:border-[color:var(--color-accent)]"
                >
                  <div>
                    <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-[color:var(--color-accent)] uppercase">
                      <span>
                        Vol. {article.issue.volume.number}, Issue{" "}
                        {article.issue.number} ({article.issue.volume.year})
                      </span>
                      {article.pageStart ? (
                        <>
                          <span>·</span>
                          <span>
                            pp. {article.pageStart}
                            {article.pageEnd ? `–${article.pageEnd}` : ""}
                          </span>
                        </>
                      ) : null}
                    </div>

                    <h3 className="mt-2 font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                      <Link
                        href={`/articles/${article.slug}`}
                        className="transition hover:text-[color:var(--color-accent)]"
                      >
                        {article.title}
                      </Link>
                    </h3>

                    {article.authors.length ? (
                      <p className="mt-2 font-mono text-xs text-[color:var(--color-subtle)]">
                        By {article.authors.map((a) => a.fullName).join(", ")}
                      </p>
                    ) : null}

                    {article.doi ? (
                      <p className="mt-1 font-mono text-[11px] text-[color:var(--color-accent)]">
                        DOI: {article.doi}
                      </p>
                    ) : null}

                    {article.abstract ? (
                      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[color:var(--color-muted)]">
                        {article.abstract}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[color:var(--color-border)] pt-4">
                    <Link
                      href={`/articles/${article.slug}`}
                      className="button-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold"
                    >
                      <span>Read Article</span>
                      <span>→</span>
                    </Link>
                    <a
                      href={`/api/articles/${article.slug}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
                    >
                      <span>PDF</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-10 text-center">
              <span className="inline-block rounded-full bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-300">
                Volume in Preparation
              </span>
              <h3 className="mt-3 font-serif text-xl font-semibold text-[color:var(--color-foreground)]">
                Submissions Open for {meta.title}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-xs text-[color:var(--color-muted)]">
                Articles for the upcoming volume of {meta.shortName} are
                currently in peer review. Submit your research today to be
                included in the next issue.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href={submissionHref}
                  className="button-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold"
                >
                  <span>Submit Manuscript to {meta.shortName}</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          )}
        </Container>
      </section>

      {/* ── SECTION 4: ARCHIVES DIRECTORY ── */}
      {journalVolumes.length > 0 ? (
        <section className="border-t border-[color:var(--color-border)] pt-12">
          <Container>
            <div className="flex items-center justify-between border-b border-[color:var(--color-border)] pb-4">
              <div>
                <p className="font-mono text-xs font-semibold text-[color:var(--color-accent)] uppercase">
                  Periodical Shelves
                </p>
                <h2 className="mt-1 font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
                  Published Volumes &amp; Issues
                </h2>
              </div>
              <Link
                href={`/archives?journal=${meta.slug}`}
                className="button-secondary px-3.5 py-1.5 text-xs font-semibold"
              >
                Open Periodical Shelf
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {journalVolumes.map((vol) => (
                <div
                  key={vol.id}
                  className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5"
                >
                  <div className="flex items-center justify-between font-mono text-xs text-[color:var(--color-accent)]">
                    <span className="font-bold">Volume {vol.number}</span>
                    <span>{vol.year}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {vol.issues.map((iss) => (
                      <Link
                        key={iss.id}
                        href={`/archives?journal=${meta.slug}`}
                        className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[color:var(--color-surface)] p-2.5 text-xs transition hover:bg-[color:var(--color-surface-strong)]"
                      >
                        <span className="font-medium text-[color:var(--color-foreground)]">
                          Issue {iss.number}
                        </span>
                        <span className="font-mono text-[10px] text-[color:var(--color-subtle)]">
                          {iss._count.articles}{" "}
                          {iss._count.articles === 1 ? "Paper" : "Papers"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>
      ) : null}
    </div>
  );
}
