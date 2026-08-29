import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessRequest,
  canManageRequest,
  canUseSubmissionPermission,
  type RequestActor,
} from "@/lib/requests/policy";
import {
  normalizeTrackingId,
  requestStatusContent,
  validateMessageBody,
  validateTrackingId,
} from "@/lib/requests/validation";

const author: RequestActor = {
  id: "author-a",
  active: true,
  author: true,
  adminDepartmentIds: [],
};
const psychologyAdmin: RequestActor = {
  id: "admin-a",
  active: true,
  author: false,
  adminDepartmentIds: ["psychology"],
};
const sociologyAdmin: RequestActor = {
  id: "admin-b",
  active: true,
  author: false,
  adminDepartmentIds: ["sociology"],
};
const request = { authorId: "author-a", departmentId: "psychology" };

test("author can access their own Psychology request", () => {
  assert.equal(canAccessRequest(author, request), true);
});

test("another author cannot access the request", () => {
  assert.equal(canAccessRequest({ ...author, id: "author-b" }, request), false);
});

test("correct department administrator can access and manage the request", () => {
  assert.equal(canAccessRequest(psychologyAdmin, request), true);
  assert.equal(canManageRequest(psychologyAdmin, request), true);
});

test("unrelated department administrator is denied", () => {
  assert.equal(canAccessRequest(sociologyAdmin, request), false);
  assert.equal(canManageRequest(sociologyAdmin, request), false);
});

test("super administrator can manage every department request", () => {
  const superAdmin = { ...sociologyAdmin, superAdmin: true };
  assert.equal(canManageRequest(superAdmin, request), true);
});

test("inactive users are denied even when otherwise scoped", () => {
  assert.equal(
    canAccessRequest({ ...psychologyAdmin, active: false }, request),
    false,
  );
});

test("submission permission belongs to the active request author", () => {
  assert.equal(
    canUseSubmissionPermission(author, {
      ...request,
      status: "NEW",
    }),
    true,
  );
  assert.equal(
    canUseSubmissionPermission(author, {
      ...request,
      status: "SUBMISSION_ENABLED",
    }),
    true,
  );
  assert.equal(
    canUseSubmissionPermission(
      { ...author, id: "author-b" },
      { ...request, status: "NEW" },
    ),
    false,
  );
  assert.equal(
    canUseSubmissionPermission(author, {
      ...request,
      status: "TRACKING_ASSIGNED",
    }),
    false,
  );
});

test("request statuses use plain operational language", () => {
  assert.equal(requestStatusContent.NEW.label, "Request active");
  assert.equal(
    requestStatusContent.AWAITING_PAYMENT.label,
    "Inquiry in progress",
  );
  assert.equal(requestStatusContent.RECEIPT_SUBMITTED.label, "Update sent");
  assert.equal(
    requestStatusContent.SUBMISSION_ENABLED.label,
    "Ready for submission",
  );
  assert.equal(
    requestStatusContent.MANUSCRIPT_SUBMITTED.label,
    "Awaiting tracking ID",
  );
});

test("tracking IDs normalize safely and reject unsupported formats", () => {
  assert.equal(normalizeTrackingId(" psy 2026/001 "), "PSY-2026/001");
  assert.equal(validateTrackingId("PSY-2026/001"), null);
  assert.match(validateTrackingId("a") ?? "", /3–50/);
  assert.match(validateTrackingId("PSY # 1") ?? "", /letters, numbers/);
});

test("messages require useful bounded text", () => {
  assert.match(validateMessageBody("  ") ?? "", /Write a message/);
  assert.equal(validateMessageBody("Please upload your receipt."), null);
  assert.match(validateMessageBody("x".repeat(5_001)) ?? "", /5,000/);
});
