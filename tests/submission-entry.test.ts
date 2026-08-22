import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canonicalSubmissionEntryPath,
  getSafeLoginReturnPath,
  getSubmissionEntryDestination,
  publicSubmissionEntryPath,
} from "@/lib/auth/submission-entry";
import { getPostLoginDestination } from "@/lib/auth/workspaces";
import { getOAuthCallbackUrl } from "@/lib/auth/oauth";

const source = (path: string) => readFileSync(path, "utf8");
const author = {
  isActive: true,
  globalRoles: [{ role: "AUTHOR" as const }],
  journalRoles: [],
};
const editor = {
  isActive: true,
  globalRoles: [],
  journalRoles: [],
};

test("public submission entry uses one canonical Author request path", () => {
  assert.equal(publicSubmissionEntryPath, "/submit");
  assert.equal(canonicalSubmissionEntryPath, "/author/requests/new");
  assert.equal(
    getSubmissionEntryDestination(null),
    "/login?next=%2Fauthor%2Frequests%2Fnew",
  );
  assert.equal(
    getSubmissionEntryDestination(author),
    canonicalSubmissionEntryPath,
  );
});

test("login return paths reject open redirects and unrelated destinations", () => {
  assert.equal(
    getSafeLoginReturnPath(canonicalSubmissionEntryPath),
    canonicalSubmissionEntryPath,
  );
  assert.equal(getSafeLoginReturnPath("https://example.com"), null);
  assert.equal(getSafeLoginReturnPath("//example.com"), null);
  assert.equal(getSafeLoginReturnPath("/admin"), null);
  assert.equal(getSafeLoginReturnPath([canonicalSubmissionEntryPath]), null);
});

test("Author login continues to the request while non-Authors are denied", () => {
  assert.equal(
    getPostLoginDestination(author, canonicalSubmissionEntryPath),
    canonicalSubmissionEntryPath,
  );
  assert.equal(
    getSubmissionEntryDestination(editor),
    "/unauthorized?reason=author",
  );
  assert.equal(
    getPostLoginDestination(editor, canonicalSubmissionEntryPath),
    "/unauthorized?reason=author",
  );
  assert.equal(
    getSubmissionEntryDestination({ ...author, isActive: false }),
    "/unauthorized?reason=inactive",
  );
});

test("public submissions page is real content rather than a placeholder", () => {
  const page = source("app/(public)/submissions/page.tsx");
  assert.match(page, /Submit your article\./);
  assert.match(page, /Start submission request/);
  assert.match(page, /Receive your tracking ID/);
  assert.doesNotMatch(
    page,
    /This section will be managed through the journal platform\./,
  );
});

test("public auth uses one Sign in action while submission intent stays canonical", () => {
  for (const path of [
    "components/layout/public-header.tsx",
    "components/layout/public-mobile-nav.tsx",
  ]) {
    const file = source(path);
    assert.match(file, /href="\/login"/);
    assert.match(file, /Sign in/);
    assert.doesNotMatch(file, /Journal Admin|Editor|Super Admin/);
  }
  assert.match(source("app/(public)/page.tsx"), /publicSubmissionEntryPath/);
});

test("OAuth callback keeps only the safe submission return path", () => {
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  try {
    assert.equal(
      getOAuthCallbackUrl(canonicalSubmissionEntryPath),
      "http://localhost:3000/auth/callback?next=%2Fauthor%2Frequests%2Fnew",
    );
    assert.equal(
      getOAuthCallbackUrl("https://example.com"),
      "http://localhost:3000/auth/callback",
    );
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous;
  }
});

test("legacy new-submission route redirects and normal navigation avoids the wizard", () => {
  assert.match(
    source("app/author/submissions/new/page.tsx"),
    /redirect\("\/submit"\)/,
  );
  assert.doesNotMatch(
    source("app/author/layout.tsx"),
    /\/author\/submissions\/new/,
  );
  assert.doesNotMatch(
    source("app/author/page.tsx"),
    /\/author\/submissions\/new/,
  );
});
