import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateIfRange,
  serveArticlePdf,
} from "@/lib/editorial/article-pdf-stream";
import { prisma } from "@/lib/db/prisma";

describe("PDF Security & RFC 9110 If-Range Suite", () => {
  after(async () => {
    await prisma.$disconnect();
    // @ts-expect-error test pool cleanup
    await globalThis.pgPool?.end();
  });

  describe("RFC 9110 If-Range Evaluation Logic", () => {
    const currentEtag = '"art-test-123-1793448000000"';
    const lastModifiedMs = 1793448000000; // Wed, 21 Oct 2026 12:00:00 GMT
    const validDateString = new Date(lastModifiedMs).toUTCString();
    const olderDateString = new Date(lastModifiedMs - 3600000).toUTCString();
    const newerDateString = new Date(lastModifiedMs + 3600000).toUTCString();

    it("returns true when no If-Range header is present", () => {
      assert.equal(evaluateIfRange(null, currentEtag, lastModifiedMs), true);
      assert.equal(
        evaluateIfRange(undefined, currentEtag, lastModifiedMs),
        true,
      );
      assert.equal(evaluateIfRange("", currentEtag, lastModifiedMs), true);
    });

    it("returns true when If-Range matches exact ETag", () => {
      assert.equal(
        evaluateIfRange(currentEtag, currentEtag, lastModifiedMs),
        true,
      );
    });

    it("returns true when If-Range matches weak/raw ETag format", () => {
      assert.equal(
        evaluateIfRange(`W/${currentEtag}`, currentEtag, lastModifiedMs),
        true,
      );
    });

    it("returns false when If-Range does not match current ETag", () => {
      assert.equal(
        evaluateIfRange('"different-etag-456"', currentEtag, lastModifiedMs),
        false,
      );
    });

    it("returns true when If-Range HTTP-Date matches modification time", () => {
      assert.equal(
        evaluateIfRange(validDateString, currentEtag, lastModifiedMs),
        true,
      );
    });

    it("returns false when If-Range HTTP-Date does not match (older or newer)", () => {
      assert.equal(
        evaluateIfRange(olderDateString, currentEtag, lastModifiedMs),
        false,
      );
      assert.equal(
        evaluateIfRange(newerDateString, currentEtag, lastModifiedMs),
        false,
      );
    });

    it("returns false for invalid or unparseable date strings", () => {
      assert.equal(
        evaluateIfRange(
          "not-a-valid-date-or-etag",
          currentEtag,
          lastModifiedMs,
        ),
        false,
      );
    });
  });

  describe("Private Storage Boundary & Trust Verification", () => {
    it("strictly denies delivery of files residing in academic-private, even if article is marked published", async () => {
      const journal = await prisma.journal.findFirst({
        include: {
          volumes: {
            include: { issues: { take: 1 } },
            take: 1,
          },
        },
      });
      if (
        !journal ||
        journal.volumes.length === 0 ||
        journal.volumes[0].issues.length === 0
      ) {
        return;
      }

      const issue = journal.volumes[0].issues[0];
      const testAdmin = await prisma.user.findFirst({
        where: { isActive: true },
      });
      if (!testAdmin) return;

      const slugPrivate = `test-private-storage-${Date.now()}`;
      const slugPublic = `test-public-storage-${Date.now()}`;
      const slugUnpublished = `test-unpub-storage-${Date.now()}`;

      // 1. Create a file in academic-private
      const privateFile = await prisma.storedFile.create({
        data: {
          bucket: "academic-private",
          objectPath: `journal/${journal.id}/private-manuscript-${Date.now()}.pdf`,
          originalFileName: "private-manuscript.pdf",
          mimeType: "application/pdf",
          sizeBytes: BigInt(50000),
          uploaderId: testAdmin.id,
        },
      });

      // 2. Create a file in published-articles
      const publicFile = await prisma.storedFile.create({
        data: {
          bucket: "published-articles",
          objectPath: `journal/${journal.id}/public-manuscript-${Date.now()}.pdf`,
          originalFileName: "public-manuscript.pdf",
          mimeType: "application/pdf",
          sizeBytes: BigInt(60000),
          uploaderId: testAdmin.id,
        },
      });

      // 3. Create Article A: Published BUT erroneously referencing academic-private
      const articlePrivate = await prisma.article.create({
        data: {
          title: "Article pointing to private storage",
          slug: slugPrivate,
          issueId: issue.id,
          isPublished: true,
          files: {
            create: {
              type: "PUBLISHED_PDF",
              storedFileId: privateFile.id,
            },
          },
        },
      });

      // 4. Create Article B: Published and referencing published-articles
      const articlePublic = await prisma.article.create({
        data: {
          title: "Article pointing to public storage",
          slug: slugPublic,
          issueId: issue.id,
          isPublished: true,
          files: {
            create: {
              type: "PUBLISHED_PDF",
              storedFileId: publicFile.id,
            },
          },
        },
      });

      // 5. Create Article C: Unpublished referencing published-articles
      const articleUnpublished = await prisma.article.create({
        data: {
          title: "Unpublished article",
          slug: slugUnpublished,
          issueId: issue.id,
          isPublished: false,
          files: {
            create: {
              type: "PUBLISHED_PDF",
              storedFileId: publicFile.id,
            },
          },
        },
      });

      try {
        const headReq = new Request("https://imsufoss.com/test", {
          method: "HEAD",
        });

        // Test 1: Published article + public bucket = ACCESSIBLE
        const resPublic = await serveArticlePdf(slugPublic, headReq);
        assert.equal(
          resPublic.status,
          200,
          "Published article in public bucket must be accessible",
        );
        assert.equal(resPublic.headers.get("content-length"), "60000");

        // Test 2: Published article + private bucket = STRICTLY DENIED (404)
        const resPrivate = await serveArticlePdf(slugPrivate, headReq);
        assert.equal(
          resPrivate.status,
          404,
          "Published article pointing to academic-private must be denied by trust boundary",
        );

        // Test 3: Unpublished article + public bucket = STRICTLY DENIED (404)
        const resUnpub = await serveArticlePdf(slugUnpublished, headReq);
        assert.equal(
          resUnpub.status,
          404,
          "Unpublished article must be denied",
        );

        // Test 4: Missing article = DENIED (404)
        const resMissing = await serveArticlePdf(
          "completely-non-existent-article-slug-9999",
          headReq,
        );
        assert.equal(resMissing.status, 404, "Missing article must return 404");

        // Test 5: If-Range matching vs non-matching evaluation
        const currentEtag = resPublic.headers.get("etag")!;

        // 5a. If-Range with matching ETag: serves Range partial response (or 416 if range bounds invalid)
        const reqIfRangeMatch = new Request(
          `https://imsufoss.com/articles/${slugPublic}.pdf`,
          {
            method: "GET",
            headers: {
              Range: "bytes=100000-200000", // unsatisfiable for 60000 bytes
              "If-Range": currentEtag,
            },
          },
        );
        const resIfRangeMatch = await serveArticlePdf(
          slugPublic,
          reqIfRangeMatch,
        );
        assert.equal(
          resIfRangeMatch.status,
          416,
          "Matching If-Range must honor Range evaluation (416 for unsatisfiable)",
        );

        // 5b. If-Range with non-matching ETag: Range is IGNORED, server evaluates full representation
        const reqIfRangeMismatch = new Request(
          `https://imsufoss.com/articles/${slugPublic}.pdf`,
          {
            method: "HEAD",
            headers: {
              Range: "bytes=100000-200000",
              "If-Range": '"stale-etag-from-past"',
            },
          },
        );
        const resIfRangeMismatch = await serveArticlePdf(
          slugPublic,
          reqIfRangeMismatch,
        );
        assert.equal(
          resIfRangeMismatch.status,
          200,
          "Mismatched If-Range must ignore Range and return full 200 representation",
        );
        assert.equal(resIfRangeMismatch.headers.get("content-length"), "60000");
      } finally {
        // Cleanup test articles and stored files
        await prisma.article.deleteMany({
          where: {
            id: {
              in: [articlePrivate.id, articlePublic.id, articleUnpublished.id],
            },
          },
        });
        await prisma.storedFile.deleteMany({
          where: { id: { in: [privateFile.id, publicFile.id] } },
        });
      }
    });
  });
});
