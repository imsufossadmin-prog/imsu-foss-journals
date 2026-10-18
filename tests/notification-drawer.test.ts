import assert from "node:assert/strict";
import test from "node:test";
import {
  formatRelativeTime,
  getNotificationMeta,
} from "@/lib/notifications/formatters";
import type { NotificationType } from "@/lib/notifications/types";

test("formatRelativeTime handles various time intervals safely", () => {
  const now = Date.now();

  // Just now (< 45s)
  const justNow = new Date(now - 10 * 1000);
  assert.strictEqual(formatRelativeTime(justNow), "Just now");

  // Minutes ago
  const fiveMinAgo = new Date(now - 5 * 60 * 1000);
  assert.strictEqual(formatRelativeTime(fiveMinAgo), "5m ago");

  // Hours ago
  const threeHoursAgo = new Date(now - 3 * 60 * 60 * 1000);
  assert.strictEqual(formatRelativeTime(threeHoursAgo), "3h ago");

  // Yesterday
  const yesterday = new Date(now - 25 * 60 * 60 * 1000);
  assert.strictEqual(formatRelativeTime(yesterday), "Yesterday");

  // Days ago (2 to 6 days)
  const fourDaysAgo = new Date(now - 4 * 24 * 60 * 60 * 1000);
  assert.strictEqual(formatRelativeTime(fourDaysAgo), "4d ago");

  // ISO string inputs
  assert.strictEqual(formatRelativeTime(fiveMinAgo.toISOString()), "5m ago");

  // Graceful handling of invalid and falsy inputs
  assert.strictEqual(formatRelativeTime(null), "");
  assert.strictEqual(formatRelativeTime(undefined), "");
  assert.strictEqual(formatRelativeTime("invalid-date-string"), "");
});

test("getNotificationMeta returns rich metadata and badges for all notification types", () => {
  const types: NotificationType[] = [
    "MANUSCRIPT_SUBMITTED",
    "TRACKING_ASSIGNED",
    "CORRECTION_REQUESTED",
    "REVIEWER_ASSIGNED",
    "REVIEW_SUBMITTED",
    "ADHERENCE_REPORT_SUBMITTED",
    "EDITORIAL_DECISION",
    "REVISION_SUBMITTED",
    "ARTICLE_PUBLISHED",
    "REQUEST_MESSAGE",
    "INTERNAL_CHAT_MESSAGE",
    "REVIEWER_APPLICATION_RECEIVED",
    "REVIEWER_APPLICATION_STATUS",
  ];

  for (const type of types) {
    const meta = getNotificationMeta(type);
    assert.ok(meta.label, `Expected label for ${type}`);
    assert.ok(meta.badgeClass, `Expected badgeClass for ${type}`);
    assert.ok(meta.icon, `Expected icon for ${type}`);
  }

  // Specific label verifications
  assert.strictEqual(
    getNotificationMeta("MANUSCRIPT_SUBMITTED").label,
    "Manuscript Intake",
  );
  assert.strictEqual(
    getNotificationMeta("REQUEST_MESSAGE").label,
    "Author Query",
  );
  assert.strictEqual(
    getNotificationMeta("CORRECTION_REQUESTED").label,
    "Correction Needed",
  );
  assert.strictEqual(
    getNotificationMeta("ARTICLE_PUBLISHED").label,
    "Article Published",
  );
  assert.strictEqual(
    getNotificationMeta("INTERNAL_CHAT_MESSAGE").label,
    "Editorial Desk",
  );
});
