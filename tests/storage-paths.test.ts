import assert from "node:assert/strict";
import test from "node:test";

import {
  createArticleObjectPath,
  createRequestObjectPath,
  createSubmissionObjectPath,
} from "@/lib/storage/paths";

test("private manuscript paths contain opaque names and no author identity", () => {
  const path = createSubmissionObjectPath({
    journalId: "journal-a",
    submissionId: "submission-a",
    originalFileName: "Ada-Lovelace-Manuscript.PDF",
  });

  assert.match(
    path,
    /^journal\/journal-a\/submission\/submission-a\/[0-9a-f-]+\.pdf$/,
  );
  assert.equal(path.includes("Ada"), false);
  assert.equal(path.includes("Lovelace"), false);
});

test("published article paths are namespaced and collision resistant", () => {
  const first = createArticleObjectPath({
    journalId: "journal-a",
    articleId: "article-a",
    originalFileName: "article.pdf",
  });
  const second = createArticleObjectPath({
    journalId: "journal-a",
    articleId: "article-a",
    originalFileName: "article.pdf",
  });

  assert.match(first, /^journal\/journal-a\/article\/article-a\//);
  assert.notEqual(first, second);
});

test("private request attachments are department-scoped and opaque", () => {
  const path = createRequestObjectPath({
    departmentId: "department-psychology",
    requestId: "request-a",
    originalFileName: "Ada-Receipt.jpg",
  });
  assert.match(
    path,
    /^department\/department-psychology\/request\/request-a\/[0-9a-f-]+\.jpg$/,
  );
  assert.equal(path.includes("Ada"), false);
  assert.equal(path.includes("Receipt"), false);
});
