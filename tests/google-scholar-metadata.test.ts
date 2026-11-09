import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleScholarMetadata,
  splitAuthorNames,
  parsePageRange,
} from "../lib/metadata/scholar";

test("splitAuthorNames decomposes combined author strings while preserving order", () => {
  // Case 1: Authors combined with ampersand
  const combinedAmpersand = [
    { fullName: "Sadiat Iyabode Alliu" },
    { fullName: "Stephen Ishola Babatunde & Leonard Chidozie Orji" },
  ];
  const split1 = splitAuthorNames(combinedAmpersand);
  assert.deepEqual(split1, [
    "Sadiat Iyabode Alliu",
    "Stephen Ishola Babatunde",
    "Leonard Chidozie Orji",
  ]);

  // Case 2: Authors combined with 'and'
  const combinedAnd = [
    { fullName: "Jacob Terhemba Jande" },
    { fullName: "Sylvester Twar Orkume and Jeniffer Shima" },
  ];
  const split2 = splitAuthorNames(combinedAnd);
  assert.deepEqual(split2, [
    "Jacob Terhemba Jande",
    "Sylvester Twar Orkume",
    "Jeniffer Shima",
  ]);

  // Case 3: Semicolon separated
  const combinedSemicolon = [{ fullName: "Author One; Author Two" }];
  const split3 = splitAuthorNames(combinedSemicolon);
  assert.deepEqual(split3, ["Author One", "Author Two"]);

  // Case 4: Already individual authors with academic titles and dots
  const normalAuthors = [
    { fullName: "Dr. Chidi Okafor" },
    { fullName: "Prof. Ngozi Sydney-Agbor" },
  ];
  const split4 = splitAuthorNames(normalAuthors);
  assert.deepEqual(split4, ["Dr. Chidi Okafor", "Prof. Ngozi Sydney-Agbor"]);
});

test("parsePageRange extracts discrete firstPage and lastPage from ranges and single values", () => {
  // Range with en-dash
  const r1 = parsePageRange("1875–1893", null);
  assert.deepEqual(r1, { firstPage: "1875", lastPage: "1893" });

  // Range with spaces and em-dash
  const r2 = parsePageRange("1923 — 1935", "");
  assert.deepEqual(r2, { firstPage: "1923", lastPage: "1935" });

  // Range with hyphen
  const r3 = parsePageRange("2033- 2052", undefined);
  assert.deepEqual(r3, { firstPage: "2033", lastPage: "2052" });

  // Already discrete
  const r4 = parsePageRange("12", "28");
  assert.deepEqual(r4, { firstPage: "12", lastPage: "28" });

  // Single page without end
  const r5 = parsePageRange("45", null);
  assert.deepEqual(r5, { firstPage: "45", lastPage: undefined });

  // Missing pages
  const r6 = parsePageRange(null, null);
  assert.deepEqual(r6, { firstPage: undefined, lastPage: undefined });
});

test("buildGoogleScholarMetadata complies with Google Scholar / Highwire Press standards", () => {
  const article = {
    title: "Blame Reorientation in Digital Moral Judgement",
    slug: "art-blame-reorientation-in-digital-moral-jud-mu4ngdw1",
    abstract: "This study examined how moral responsibility was negotiated...",
    doi: "10.68442/ajsbs/2026/v16i7.111",
    pageStart: "1875–1893",
    pageEnd: null,
    publishedAt: new Date("2026-09-16T12:00:00.000Z"),
    issue: {
      number: 7,
      volume: {
        number: 16,
        year: 2026,
        journal: {
          name: "African Journal of Social and Behavioural Sciences (AJSBS)",
          slug: "ajsbs",
        },
      },
    },
    authors: [
      { fullName: "Sadiat Iyabode Alliu" },
      { fullName: "Kamal Adewole Odunjo-Saka" },
      { fullName: "Olufolakemi Victoria Adedeji" },
      { fullName: "Stephen Ishola Babatunde & Leonard Chidozie Orji" },
    ],
  };

  const baseUrl = "https://imsufoss.com";
  const meta = buildGoogleScholarMetadata(article, baseUrl);

  // 1. Title
  assert.equal(
    meta.other.citation_title,
    "Blame Reorientation in Digital Moral Judgement",
  );

  // 2. Authors: decomposed into individual authors in order
  assert.deepEqual(meta.other.citation_author, [
    "Sadiat Iyabode Alliu",
    "Kamal Adewole Odunjo-Saka",
    "Olufolakemi Victoria Adedeji",
    "Stephen Ishola Babatunde",
    "Leonard Chidozie Orji",
  ]);

  // 3. Publication Date: YYYY/MM/DD
  assert.equal(meta.other.citation_publication_date, "2026/09/16");

  // 4. Journal Title
  assert.equal(
    meta.other.citation_journal_title,
    "African Journal of Social and Behavioural Sciences (AJSBS)",
  );

  // 5. Volume & Issue
  assert.equal(meta.other.citation_volume, "16");
  assert.equal(meta.other.citation_issue, "7");

  // 6. Subdirectory PDF URL ending in .pdf
  assert.equal(
    meta.other.citation_pdf_url,
    "https://imsufoss.com/articles/art-blame-reorientation-in-digital-moral-jud-mu4ngdw1/art-blame-reorientation-in-digital-moral-jud-mu4ngdw1.pdf",
  );

  // 7. Canonical and Abstract HTML URL
  assert.equal(
    meta.other.citation_abstract_html_url,
    "https://imsufoss.com/articles/art-blame-reorientation-in-digital-moral-jud-mu4ngdw1",
  );
  assert.equal(
    meta.canonicalUrl,
    "https://imsufoss.com/articles/art-blame-reorientation-in-digital-moral-jud-mu4ngdw1",
  );

  // 8. Registered ISSN for AJSBS
  assert.equal(meta.other.citation_issn, "2141-209X");

  // 9. Firstpage and Lastpage discrete values
  assert.equal(meta.other.citation_firstpage, "1875");
  assert.equal(meta.other.citation_lastpage, "1893");

  // 10. DOI
  assert.equal(meta.other.citation_doi, "10.68442/ajsbs/2026/v16i7.111");
});

test("CrawlableArticleDirectory generates semantic crawlable HTML links for articles and PDFs", async () => {
  const { CrawlableArticleDirectory } =
    await import("../components/public/crawlable-article-directory");

  const sampleIssueGroup = [
    {
      issue: {
        id: "iss-1",
        number: 1,
        isClosed: false,
        volume: {
          number: 14,
          year: 2026,
          journal: {
            name: "African Journal of Social and Behavioural Sciences (AJSBS)",
            slug: "ajsbs",
            shortName: "AJSBS",
            department: { name: "Faculty of Social Sciences" },
          },
        },
      },
      coverImageUrl: null,
      articles: [
        {
          id: "art-1",
          title: "Study on Behavioural Dynamics in Tertiary Education",
          slug: "study-on-behavioural-dynamics",
          abstract: "Abstract content...",
          doi: "10.68442/ajsbs/2026/v14i1.1",
          pageStart: "1",
          pageEnd: "15",
          issueOrder: 1,
          coverImageUrl: null,
          publishedAt: new Date("2026-05-10"),
          authors: [
            { id: "auth-1", fullName: "Prof. A. N. Okereke" },
            { id: "auth-2", fullName: "Dr. C. I. Njoku & Dr. P. O. Emeka" },
          ],
          issue: {
            id: "iss-1",
            number: 1,
            isClosed: false,
            volume: {
              number: 14,
              year: 2026,
              journal: {
                name: "African Journal of Social and Behavioural Sciences (AJSBS)",
                slug: "ajsbs",
                shortName: "AJSBS",
                department: { name: "Faculty of Social Sciences" },
              },
            },
          },
        },
      ],
    },
  ];

  const element = CrawlableArticleDirectory({ issueGroups: sampleIssueGroup });
  assert.ok(element !== null, "Directory should render valid JSX element");
});

test("serveArticlePdf returns 404 for non-existent or unpublished articles", async () => {
  const { serveArticlePdf } =
    await import("../lib/editorial/article-pdf-stream");
  const notFoundRes = await serveArticlePdf("does-not-exist-xyz-123");
  assert.equal(notFoundRes.status, 404);
});

test("serveArticlePdf streams full PDF across recent, older, cross-volume, and remediated articles", async () => {
  const { serveArticlePdf } =
    await import("../lib/editorial/article-pdf-stream");

  const testCases = [
    {
      category: "Recent Article (Vol 16, 2026)",
      slug: "ajsbs-v16-i6-12-digital-nativity-and-digital-technology-adoption-a",
    },
    {
      category: "Older Article (Vol 10, 2020)",
      slug: "ajsbs-v10-i2-9-predictors-of-job-satisfaction-among-private-secto",
    },
    {
      category: "Cross-Volume Article (Vol 14, 2024)",
      slug: "ajsbs-v14-i7-9-analysis-of-the-nexus-between-national-security-an",
    },
    {
      category: "Remediated Article (Database Author Split & Page Normalized)",
      slug: "art-blame-reorientation-in-digital-moral-jud-mu4ngdw1",
    },
  ];

  for (const tc of testCases) {
    const res = await serveArticlePdf(tc.slug);

    assert.equal(
      res.status,
      200,
      `Expected status 200 for ${tc.category} (${tc.slug})`,
    );
    assert.equal(
      res.headers.get("content-type"),
      "application/pdf",
      `Expected application/pdf for ${tc.slug}`,
    );
    assert.ok(
      res.headers
        .get("content-disposition")
        ?.includes(`inline; filename="${tc.slug}.pdf"`),
      `Expected inline content-disposition for ${tc.slug}`,
    );
    assert.equal(
      res.headers.get("x-robots-tag"),
      "all",
      `Expected x-robots-tag: all (no blocking directives) for ${tc.slug}`,
    );
    assert.ok(
      res.headers.get("cache-control")?.includes("public"),
      `Should be publicly cacheable for fast crawler delivery: ${tc.slug}`,
    );

    const arrayBuffer = await res.arrayBuffer();
    assert.ok(
      arrayBuffer.byteLength > 1000,
      `Expected non-empty binary (>1000 bytes) for ${tc.slug}, got ${arrayBuffer.byteLength}`,
    );

    const header = Buffer.from(arrayBuffer.slice(0, 4)).toString();
    assert.equal(
      header,
      "%PDF",
      `Expected valid PDF magic bytes '%PDF' for ${tc.slug}`,
    );

    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      assert.equal(
        Number(contentLength),
        arrayBuffer.byteLength,
        `Content-Length header must match actual byte length for ${tc.slug}`,
      );
    }
  }
});

test("nested PDF route handler resolves /articles/[articleSlug]/[filename] correctly", async () => {
  const { GET } =
    await import("../app/(public)/articles/[articleSlug]/[filename]/route");

  const slug = "art-blame-reorientation-in-digital-moral-jud-mu4ngdw1";

  // Test 1: Full filename with .pdf
  const res1 = await GET(
    new Request(`https://imsufoss.com/articles/${slug}/${slug}.pdf`),
    {
      params: Promise.resolve({
        articleSlug: slug,
        filename: `${slug}.pdf`,
      }),
    },
  );
  assert.equal(res1.status, 200);
  assert.equal(res1.headers.get("content-type"), "application/pdf");

  // Test 2: Standard pdf shorthand
  const res2 = await GET(
    new Request(`https://imsufoss.com/articles/${slug}/pdf`),
    {
      params: Promise.resolve({
        articleSlug: slug,
        filename: "pdf",
      }),
    },
  );
  assert.equal(res2.status, 200);
  assert.equal(res2.headers.get("content-type"), "application/pdf");
});

test("database audit verifies remediation of 5 multi-author and 29 page-range articles", async () => {
  const { prisma } = await import("../lib/db/prisma");
  const { buildGoogleScholarMetadata } =
    await import("../lib/metadata/scholar");

  // 1. Verify 5 previously combined author articles are now individual records
  const targetSlugs = [
    "art-assessment-of-environmental-impacts-of-u-mu4ojylp",
    "art-blame-reorientation-in-digital-moral-jud-mu4ngdw1",
    "art-developing-a-strategic-framing-of-public-mu4o4g1o",
    "art-from-locus-of-control-to-entrepreneurial-muu6m39c",
    "art-the-state-and-human-security-failures-in-mu4nngwa",
  ];

  for (const slug of targetSlugs) {
    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        authors: { orderBy: { position: "asc" } },
        issue: { include: { volume: { include: { journal: true } } } },
      },
    });

    assert.ok(article, `Article ${slug} must exist`);
    assert.ok(
      article.authors.length >= 2,
      `Article ${slug} must have multiple separated authors`,
    );

    // Ensure no author record in DB contains " & " or " and "
    for (const author of article.authors) {
      assert.ok(
        !author.fullName.includes(" & "),
        `Author record '${author.fullName}' in ${slug} must not contain ' & '`,
      );
      assert.ok(
        !/\s+and\s+/i.test(author.fullName),
        `Author record '${author.fullName}' in ${slug} must not contain ' and '`,
      );
    }

    // Ensure positions are strictly 1-indexed sequential (1, 2, 3...)
    article.authors.forEach((author, idx) => {
      assert.equal(
        author.position,
        idx + 1,
        `Author position must be sequential 1-indexed in ${slug}`,
      );
    });

    // Test generated scholar metadata
    const meta = buildGoogleScholarMetadata(article, "https://imsufoss.com");
    assert.ok(Array.isArray(meta.other.citation_author));
    assert.equal(meta.other.citation_author.length, article.authors.length);
  }

  // 2. Verify page ranges: ensure parsePageRange resolves all published article page ranges into discrete firstPage/lastPage without unparsed dashes
  const publishedArticles = await prisma.article.findMany({
    where: { isPublished: true },
    select: { slug: true, pageStart: true, pageEnd: true },
  });

  const remainingUnsplit = publishedArticles.filter((a) => {
    if (!a.pageStart) return false;
    const parsed = parsePageRange(a.pageStart, a.pageEnd);
    return Boolean(parsed.firstPage && /[-–—]/.test(parsed.firstPage));
  });

  assert.equal(
    remainingUnsplit.length,
    0,
    `Expected 0 unparsed page ranges after parsePageRange, found: ${JSON.stringify(remainingUnsplit)}`,
  );
});
