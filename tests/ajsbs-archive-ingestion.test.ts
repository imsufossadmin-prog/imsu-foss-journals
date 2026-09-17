import assert from "node:assert/strict";
import test from "node:test";

import {
  parseIssueFolderName,
  parsePublicationDate,
  slugifyTitle,
} from "../scripts/ingest-ajsbs-archive";

test("AJSBS Ingestion: parseIssueFolderName parses regular issues accurately", () => {
  const parsed = parseIssueFolderName("01_Vol. 16 No. 6 (2026)");
  assert.equal(parsed.volume, 16);
  assert.equal(parsed.issueNumber, 6);
  assert.equal(parsed.year, 2026);
  assert.equal(parsed.title, "Vol. 16 No. 6 (2026)");
  assert.equal(parsed.isSpecial, false);
});

test("AJSBS Ingestion: parseIssueFolderName handles special issue and prevents collision", () => {
  const parsed = parseIssueFolderName(
    "09_Special Issue - Vol. 15 No. 1 (2025)",
  );
  assert.equal(parsed.volume, 15);
  assert.equal(parsed.issueNumber, 11);
  assert.equal(parsed.year, 2025);
  assert.equal(parsed.isSpecial, true);
  assert.equal(parsed.title, "Special Issue - Vol. 15 No. 1 (2025)");
});

test("AJSBS Ingestion: parseIssueFolderName handles month prefixes and edition titles", () => {
  const p1 = parseIssueFolderName("26_September - Vol. 13 No. 2 (2023)");
  assert.equal(p1.volume, 13);
  assert.equal(p1.issueNumber, 2);
  assert.equal(p1.year, 2023);

  const p2 = parseIssueFolderName(
    "28_September Edition - Vol. 12 No. 2 (2022)",
  );
  assert.equal(p2.volume, 12);
  assert.equal(p2.issueNumber, 2);
  assert.equal(p2.year, 2022);
});

test("AJSBS Ingestion: slugifyTitle sanitizes special characters and limits length", () => {
  const title =
    "DIGITAL ENTREPRENEURIAL INTELLIGENCE IN EMERGING ECONOMIES: AN MIS CONCEPTUAL FRAMEWORK FOR DIGITAL VALUE CREATION IN NIGERIA";
  const slug = slugifyTitle(title);
  assert.equal(slug, "digital-entrepreneurial-intelligence-in-emerging-e");
  assert.ok(slug.length <= 50);
  assert.ok(!slug.endsWith("-"));
});

test("AJSBS Ingestion: parsePublicationDate handles full date, year-only, and fallbacks", () => {
  const d1 = parsePublicationDate("2026/08/22", 2026);
  assert.equal(d1.getUTCFullYear(), 2026);
  assert.equal(d1.getUTCMonth(), 7); // August is 7
  assert.equal(d1.getUTCDate(), 22);

  const d2 = parsePublicationDate("2024", 2024);
  assert.equal(d2.getUTCFullYear(), 2024);
  assert.equal(d2.getUTCMonth(), 0);

  const d3 = parsePublicationDate(undefined, 2025);
  assert.equal(d3.getUTCFullYear(), 2025);
});
