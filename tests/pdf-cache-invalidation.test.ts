import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { serveArticlePdf } from "@/lib/editorial/article-pdf-stream";
import { invalidateArticlePublicCaches } from "@/lib/editorial/cache-invalidation";
import { prisma } from "@/lib/db/prisma";

describe("PDF Cache Invalidation and Lifecycle State Suite", () => {
  after(async () => {
    await prisma.$disconnect();
    // @ts-expect-error test pool cleanup
    await globalThis.pgPool?.end();
  });

  it("verifies full article lifecycle: publish -> cache -> replace -> unpublish -> delete", async () => {
    // 1. Find a journal and volume/issue to associate a test article with
    const journal = await prisma.journal.findFirst({
      include: {
        volumes: {
          include: {
            issues: { take: 1 },
          },
          take: 1,
        },
      },
    });

    if (
      !journal ||
      journal.volumes.length === 0 ||
      journal.volumes[0].issues.length === 0
    ) {
      return; // Skip if db fixtures unavailable
    }

    const issue = journal.volumes[0].issues[0];
    const testAdmin = await prisma.user.findFirst({
      where: { isActive: true },
    });

    if (!testAdmin) return;

    const testSlug = `test-lifecycle-${Date.now()}`;
    const initialSize = BigInt(102400); // 100 KB
    const initialTime = new Date("2026-10-01T12:00:00Z");

    // Create Initial Stored File 1
    const storedFile1 = await prisma.storedFile.create({
      data: {
        bucket: "published-articles",
        objectPath: `journal/${journal.id}/test/v1-${Date.now()}.pdf`,
        originalFileName: "initial-manuscript.pdf",
        mimeType: "application/pdf",
        sizeBytes: initialSize,
        uploaderId: testAdmin.id,
      },
    });

    // 1. Publish Article
    const article = await prisma.article.create({
      data: {
        title: "Test Invalidation Article",
        slug: testSlug,
        issueId: issue.id,
        isPublished: true,
        publishedAt: initialTime,
        updatedAt: initialTime,
        files: {
          create: {
            type: "PUBLISHED_PDF",
            storedFileId: storedFile1.id,
          },
        },
      },
    });

    try {
      // Step A: Initial Request to Published Article
      const headReq1 = new Request(
        `https://imsufoss.com/articles/${testSlug}/${testSlug}.pdf`,
        {
          method: "HEAD",
        },
      );
      const res1 = await serveArticlePdf(testSlug, headReq1);
      assert.equal(res1.status, 200);
      assert.equal(res1.headers.get("content-length"), "102400");
      assert.equal(res1.headers.get("accept-ranges"), "bytes");
      assert.ok(res1.headers.get("etag"));

      const etag1 = res1.headers.get("etag")!;

      // Step B: Revalidation with etag1 returns 304 Not Modified
      const condReq1 = new Request(
        `https://imsufoss.com/articles/${testSlug}/${testSlug}.pdf`,
        {
          method: "GET",
          headers: { "If-None-Match": etag1 },
        },
      );
      const resCond1 = await serveArticlePdf(testSlug, condReq1);
      assert.equal(resCond1.status, 304);

      // Step C: Replace Article PDF (simulate admin re-upload with updated timestamp and size)
      const replacementSize = BigInt(204800); // 200 KB
      const replacementTime = new Date("2026-11-01T15:00:00Z");

      const storedFile2 = await prisma.storedFile.create({
        data: {
          bucket: "published-articles",
          objectPath: `journal/${journal.id}/test/v2-${Date.now()}.pdf`,
          originalFileName: "replacement-manuscript.pdf",
          mimeType: "application/pdf",
          sizeBytes: replacementSize,
          uploaderId: testAdmin.id,
        },
      });

      // Update Article to point to new file and update timestamp
      await prisma.article.update({
        where: { id: article.id },
        data: {
          updatedAt: replacementTime,
          files: {
            deleteMany: {},
            create: {
              type: "PUBLISHED_PDF",
              storedFileId: storedFile2.id,
            },
          },
        },
      });

      // Trigger Cache Invalidation helper
      invalidateArticlePublicCaches({
        slug: testSlug,
        journalSlug: journal.slug,
      });

      // Step D: Request the URL again after replacement
      const headReq2 = new Request(
        `https://imsufoss.com/articles/${testSlug}/${testSlug}.pdf`,
        {
          method: "HEAD",
        },
      );
      const res2 = await serveArticlePdf(testSlug, headReq2);
      assert.equal(res2.status, 200);
      assert.equal(res2.headers.get("content-length"), "204800");

      const etag2 = res2.headers.get("etag")!;
      assert.notEqual(etag1, etag2, "ETag must change after PDF replacement");

      // Verify that old ETag is rejected and returns full 200 (not stale 304)
      const staleCondReq = new Request(
        `https://imsufoss.com/articles/${testSlug}/${testSlug}.pdf`,
        {
          method: "HEAD",
          headers: { "If-None-Match": etag1 },
        },
      );
      const resStale = await serveArticlePdf(testSlug, staleCondReq);
      assert.equal(
        resStale.status,
        200,
        "Old ETag must not receive 304 after replacement",
      );
      assert.equal(resStale.headers.get("content-length"), "204800");

      // Step E: Unpublish the article
      await prisma.article.update({
        where: { id: article.id },
        data: { isPublished: false },
      });

      invalidateArticlePublicCaches({
        slug: testSlug,
        journalSlug: journal.slug,
      });

      // Confirm origin immediately returns 404
      const resUnpublished = await serveArticlePdf(testSlug, headReq2);
      assert.equal(
        resUnpublished.status,
        404,
        "Unpublished article must return 404 from origin",
      );

      // Step F: Delete the article
      await prisma.article.delete({
        where: { id: article.id },
      });

      invalidateArticlePublicCaches({
        slug: testSlug,
        journalSlug: journal.slug,
      });

      // Confirm origin returns 404 for deleted article
      const resDeleted = await serveArticlePdf(testSlug, headReq2);
      assert.equal(
        resDeleted.status,
        404,
        "Deleted article must return 404 from origin",
      );

      // Cleanup test stored files
      await prisma.storedFile.deleteMany({
        where: { id: { in: [storedFile1.id, storedFile2.id] } },
      });
    } catch (err) {
      // Clean up in case of failure
      await prisma.article.deleteMany({ where: { slug: testSlug } });
      await prisma.storedFile.deleteMany({
        where: { id: { in: [storedFile1.id] } },
      });
      throw err;
    }
  });
});
