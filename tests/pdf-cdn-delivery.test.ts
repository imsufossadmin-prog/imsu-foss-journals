import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import {
  parseRangeHeader,
  serveArticlePdf,
} from "@/lib/editorial/article-pdf-stream";
import { prisma } from "@/lib/db/prisma";

describe("Public PDF CDN Delivery Optimization Suite", () => {
  after(async () => {
    await prisma.$disconnect();
    // @ts-expect-error test pool cleanup
    await globalThis.pgPool?.end();
  });
  describe("HTTP Range Parser (RFC 9110 compliant)", () => {
    const totalSize = 10000;

    it("correctly parses standard byte range (0-499)", () => {
      const result = parseRangeHeader("bytes=0-499", totalSize);
      assert.deepEqual(result, { start: 0, end: 499 });
    });

    it("correctly parses open-ended byte range (500-)", () => {
      const result = parseRangeHeader("bytes=500-", totalSize);
      assert.deepEqual(result, { start: 500, end: totalSize - 1 });
    });

    it("correctly parses suffix byte range (-500)", () => {
      const result = parseRangeHeader("bytes=-500", totalSize);
      assert.deepEqual(result, { start: totalSize - 500, end: totalSize - 1 });
    });

    it("clamps suffix byte range when suffix exceeds total size (-20000)", () => {
      const result = parseRangeHeader("bytes=-20000", totalSize);
      assert.deepEqual(result, { start: 0, end: totalSize - 1 });
    });

    it("returns unsatisfiable when start byte exceeds total size", () => {
      const result = parseRangeHeader("bytes=10000-", totalSize);
      assert.equal(result, "unsatisfiable");
    });

    it("returns unsatisfiable when start range exceeds total size", () => {
      const result = parseRangeHeader("bytes=12000-15000", totalSize);
      assert.equal(result, "unsatisfiable");
    });

    it("returns invalid when range is reversed (500-200)", () => {
      const result = parseRangeHeader("bytes=500-200", totalSize);
      assert.equal(result, "invalid");
    });

    it("returns invalid for non-byte units or malformed headers", () => {
      assert.equal(parseRangeHeader("items=0-10", totalSize), "invalid");
      assert.equal(parseRangeHeader("bytes=", totalSize), "invalid");
      assert.equal(parseRangeHeader("bytes=abc-def", totalSize), "invalid");
    });
  });

  describe("Published Article PDF CDN Headers and Fast Paths", () => {
    it("returns 404 for non-existent article", async () => {
      const response = await serveArticlePdf(
        "non-existent-article-slug-xyz-999",
      );
      assert.equal(response.status, 404);
    });

    it("handles HEAD requests with 200 OK, full metadata headers, and empty body", async () => {
      // Find one published article with a file in the database
      const publishedArticle = await prisma.article.findFirst({
        where: {
          isPublished: true,
          files: {
            some: { type: { in: ["PRODUCTION_FILE", "PUBLISHED_PDF"] } },
          },
        },
        include: {
          files: {
            where: { type: { in: ["PRODUCTION_FILE", "PUBLISHED_PDF"] } },
            include: { storedFile: true },
            take: 1,
          },
        },
      });

      if (!publishedArticle) {
        // If no published article found in current test env, skip live DB test
        return;
      }

      const request = new Request(
        "https://imsufoss.com/articles/" + publishedArticle.slug + ".pdf",
        {
          method: "HEAD",
          headers: {
            "User-Agent": "Googlebot-Scholar",
          },
        },
      );

      const response = await serveArticlePdf(publishedArticle.slug, request);

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "application/pdf");
      assert.equal(response.headers.get("accept-ranges"), "bytes");
      assert.equal(response.headers.get("x-robots-tag"), "all");
      assert.ok(response.headers.get("etag"));
      assert.ok(
        response.headers.get("cache-control")?.includes("s-maxage=31536000"),
      );
      assert.ok(
        response.headers
          .get("cdn-cache-control")
          ?.includes("s-maxage=31536000"),
      );
      assert.ok(
        response.headers
          .get("vercel-cdn-cache-control")
          ?.includes("s-maxage=31536000"),
      );

      const expectedSize = publishedArticle.files[0]?.storedFile?.sizeBytes;
      if (expectedSize) {
        assert.equal(
          response.headers.get("content-length"),
          String(expectedSize),
        );
      }

      // HEAD body must be null / empty
      const bodyText = await response.text();
      assert.equal(bodyText, "");
    });

    it("handles conditional requests (If-None-Match) returning 304 Not Modified without storage access", async () => {
      const publishedArticle = await prisma.article.findFirst({
        where: {
          isPublished: true,
          files: {
            some: { type: { in: ["PRODUCTION_FILE", "PUBLISHED_PDF"] } },
          },
        },
      });

      if (!publishedArticle) return;

      const lastModifiedTime = publishedArticle.updatedAt
        ? publishedArticle.updatedAt.getTime()
        : 0;
      const validEtag = `"${publishedArticle.slug}-${lastModifiedTime}"`;

      const request = new Request(
        "https://imsufoss.com/articles/" + publishedArticle.slug + ".pdf",
        {
          method: "GET",
          headers: {
            "If-None-Match": validEtag,
            "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
          },
        },
      );

      const response = await serveArticlePdf(publishedArticle.slug, request);
      assert.equal(response.status, 304);
      assert.equal(response.headers.get("etag"), validEtag);
      assert.ok(
        response.headers.get("cache-control")?.includes("s-maxage=31536000"),
      );
    });

    it("handles unsatisfiable Range requests returning 416 Range Not Satisfiable", async () => {
      const publishedArticle = await prisma.article.findFirst({
        where: {
          isPublished: true,
          files: {
            some: { type: { in: ["PRODUCTION_FILE", "PUBLISHED_PDF"] } },
          },
        },
        include: {
          files: {
            where: { type: { in: ["PRODUCTION_FILE", "PUBLISHED_PDF"] } },
            include: { storedFile: true },
            take: 1,
          },
        },
      });

      if (!publishedArticle) return;

      const totalSize = Number(
        publishedArticle.files[0]?.storedFile?.sizeBytes ?? 1000,
      );
      const invalidRange = `bytes=${totalSize + 50000}-${totalSize + 60000}`;

      const request = new Request(
        "https://imsufoss.com/articles/" + publishedArticle.slug + ".pdf",
        {
          method: "GET",
          headers: {
            Range: invalidRange,
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
          },
        },
      );

      const response = await serveArticlePdf(publishedArticle.slug, request);
      assert.equal(response.status, 416);
      assert.equal(
        response.headers.get("content-range"),
        `bytes */${totalSize}`,
      );
    });

    it("provides identical cache headers and accessibility across different crawlers and user agents", async () => {
      const publishedArticle = await prisma.article.findFirst({
        where: {
          isPublished: true,
          files: {
            some: { type: { in: ["PRODUCTION_FILE", "PUBLISHED_PDF"] } },
          },
        },
      });

      if (!publishedArticle) return;

      const userAgents = [
        "Googlebot/2.1 (+http://www.google.com/bot.html)",
        "Googlebot-Scholar",
        "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
        "Bytespider; spider-feedback@bytedance.com",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ];

      for (const ua of userAgents) {
        const req = new Request(
          "https://imsufoss.com/articles/" + publishedArticle.slug + ".pdf",
          {
            method: "HEAD",
            headers: { "User-Agent": ua },
          },
        );

        const res = await serveArticlePdf(publishedArticle.slug, req);
        assert.equal(res.status, 200, `Expected 200 for UA: ${ua}`);
        assert.equal(
          res.headers.get("x-robots-tag"),
          "all",
          `Expected X-Robots-Tag for UA: ${ua}`,
        );
        assert.equal(
          res.headers.get("accept-ranges"),
          "bytes",
          `Expected Accept-Ranges for UA: ${ua}`,
        );
        assert.ok(
          res.headers.get("cache-control")?.includes("s-maxage=31536000"),
        );
      }
    });
  });
});
