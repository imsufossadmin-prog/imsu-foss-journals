import assert from "node:assert/strict";
import test from "node:test";

test("Google Scholar / Highwire Press metadata tags structure", () => {
  const article = {
    title:
      "Psychosocial Factors and Academic Performance in Imo State Universities",
    abstract:
      "This study investigates the psychosocial determinants of academic performance...",
    doi: "10.1234/njcp.2026.1.1",
    slug: "psychosocial-factors-and-academic-performance",
    pageStart: "12",
    pageEnd: "28",
    publishedAt: new Date("2026-04-15T10:00:00.000Z"),
    isPublished: true,
    issue: {
      number: 1,
      volume: {
        number: 14,
        journal: {
          name: "Nigerian Journal of Contemporary Psychology (NJCP)",
        },
      },
    },
    authors: [
      { id: "a1", fullName: "Dr. Chidi Okafor", position: 1 },
      { id: "a2", fullName: "Prof. Ngozi Sydney-Agbor", position: 2 },
    ],
  };

  const journalName = article.issue.volume.journal.name;
  const pubDate = article.publishedAt
    .toISOString()
    .split("T")[0]
    .replaceAll("-", "/");

  const baseUrl = "https://imsu-foss.ng";
  const pdfUrl = `${baseUrl}/api/articles/${article.slug}/pdf`;

  const authorNames = article.authors.map((a) => a.fullName);

  const otherMeta: Record<string, string | string[]> = {
    citation_title: article.title,
    citation_publication_date: pubDate,
    citation_journal_title: journalName,
    citation_volume: String(article.issue.volume.number),
    citation_issue: String(article.issue.number),
    citation_pdf_url: pdfUrl,
  };

  if (authorNames.length > 0) {
    otherMeta.citation_author = authorNames;
  }
  if (article.pageStart) otherMeta.citation_firstpage = article.pageStart;
  if (article.pageEnd) otherMeta.citation_lastpage = article.pageEnd;
  if (article.doi) otherMeta.citation_doi = article.doi;

  assert.equal(
    otherMeta.citation_title,
    "Psychosocial Factors and Academic Performance in Imo State Universities",
  );
  assert.deepEqual(otherMeta.citation_author, [
    "Dr. Chidi Okafor",
    "Prof. Ngozi Sydney-Agbor",
  ]);
  assert.equal(otherMeta.citation_publication_date, "2026/04/15");
  assert.equal(
    otherMeta.citation_journal_title,
    "Nigerian Journal of Contemporary Psychology (NJCP)",
  );
  assert.equal(otherMeta.citation_volume, "14");
  assert.equal(otherMeta.citation_issue, "1");
  assert.equal(otherMeta.citation_doi, "10.1234/njcp.2026.1.1");
  assert.equal(
    otherMeta.citation_pdf_url,
    "https://imsu-foss.ng/api/articles/psychosocial-factors-and-academic-performance/pdf",
  );
  assert.equal(otherMeta.citation_firstpage, "12");
  assert.equal(otherMeta.citation_lastpage, "28");
});
