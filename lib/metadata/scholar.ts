import {
  getJournalMetadata,
  getOfficialJournalFullName,
} from "@/lib/editorial/editorial-board-data";

/**
 * Splits raw author strings into distinct, individual author names.
 * Handles cases where multiple authors were entered into a single name field,
 * such as "Stephen Ishola Babatunde & Leonard Chidozie Orji" or
 * "Sylvester Twar Orkume and Jeniffer Shima".
 * Preserves author order and removes duplicates.
 */
export function splitAuthorNames(
  authors: Array<{ fullName: string }> | string[],
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of authors) {
    const raw = typeof item === "string" ? item : item.fullName;
    if (!raw || !raw.trim()) continue;

    // Split on " & ", " and " (case-insensitive with boundary), or semicolon
    const parts = raw
      .split(/(?:\s+&\s+|\s+and\s+|;\s*)/i)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    for (const part of parts) {
      const cleaned = part.replace(/^["']|["']$/g, "").trim();
      if (cleaned && !seen.has(cleaned.toLowerCase())) {
        seen.add(cleaned.toLowerCase());
        result.push(cleaned);
      }
    }
  }

  return result;
}

/**
 * Safely parses start and end page numbers from pageStart and pageEnd fields.
 * If pageStart contains a range (e.g. "1875–1893" or "1923 - 1935"), it splits
 * the values into discrete firstPage and lastPage strings as required by Highwire Press.
 */
export function parsePageRange(
  pageStart?: string | null,
  pageEnd?: string | null,
): { firstPage?: string; lastPage?: string } {
  let firstPage = pageStart?.trim() || undefined;
  let lastPage = pageEnd?.trim() || undefined;

  if (firstPage && (!lastPage || lastPage === "")) {
    // Match start and end numbers separated by en-dash, em-dash, hyphen, or "to"
    const match = firstPage.match(/^(\d+)\s*(?:[–—\-]|to)\s*(\d+)$/i);
    if (match) {
      firstPage = match[1];
      lastPage = match[2];
    }
  }

  return { firstPage, lastPage };
}

export interface ScholarArticleInput {
  title: string;
  slug: string;
  publishedAt?: Date | string | null;
  pageStart?: string | null;
  pageEnd?: string | null;
  doi?: string | null;
  abstract?: string | null;
  issue: {
    number: number;
    volume: {
      number: number;
      year: number;
      journal: {
        name: string;
        slug: string;
      };
    };
  };
  authors: Array<{ fullName: string }>;
}

/**
 * Generates standards-compliant Google Scholar / Highwire Press citation metadata.
 * Ensures:
 * 1. Each author is emitted as an individual string (generating multiple citation_author tags).
 * 2. citation_pdf_url points to a subpath in the same subdirectory (/articles/[slug]/[slug].pdf).
 * 3. citation_abstract_html_url is explicitly declared.
 * 4. citation_issn is emitted when registered for the journal.
 * 5. citation_firstpage and citation_lastpage are discrete values.
 */
export function buildGoogleScholarMetadata(
  article: ScholarArticleInput,
  baseUrl: string,
): {
  title: string;
  description?: string;
  canonicalUrl: string;
  pdfUrl: string;
  other: Record<string, string | string[]>;
} {
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const journalSlug = article.issue.volume.journal.slug;
  const journalName = getOfficialJournalFullName(
    journalSlug,
    article.issue.volume.journal.name,
  );
  const journalMeta = getJournalMetadata(journalSlug);

  const pubDate = article.publishedAt
    ? (article.publishedAt instanceof Date
        ? article.publishedAt
        : new Date(article.publishedAt)
      )
        .toISOString()
        .split("T")[0]
        .replaceAll("-", "/")
    : new Date().toISOString().split("T")[0].replaceAll("-", "/");

  // Google Scholar Subdirectory Rule: PDF must be on same host and in same subdirectory as HTML abstract
  const canonicalUrl = `${cleanBaseUrl}/articles/${article.slug}`;
  const pdfUrl = `${cleanBaseUrl}/articles/${article.slug}/${article.slug}.pdf`;

  const authorNames = splitAuthorNames(article.authors);
  const { firstPage, lastPage } = parsePageRange(
    article.pageStart,
    article.pageEnd,
  );

  const otherMeta: Record<string, string | string[]> = {
    citation_title: article.title,
    citation_publication_date: pubDate,
    citation_journal_title: journalName,
    citation_volume: String(article.issue.volume.number),
    citation_issue: String(article.issue.number),
    citation_pdf_url: pdfUrl,
    citation_abstract_html_url: canonicalUrl,
  };

  if (authorNames.length > 0) {
    otherMeta.citation_author = authorNames;
  }

  const issn =
    journalMeta?.issnPrint || journalMeta?.issnOnline || journalMeta?.issnL;
  if (issn) {
    otherMeta.citation_issn = issn;
  }

  if (firstPage) {
    otherMeta.citation_firstpage = firstPage;
  }
  if (lastPage) {
    otherMeta.citation_lastpage = lastPage;
  }

  if (article.doi) {
    otherMeta.citation_doi = article.doi;
  }

  return {
    title: `${article.title} | ${journalName}`,
    description: article.abstract ?? undefined,
    canonicalUrl,
    pdfUrl,
    other: otherMeta,
  };
}
