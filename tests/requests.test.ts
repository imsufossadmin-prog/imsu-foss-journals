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

test("same author can access multiple requests across different journals independently", () => {
  const econRequest = {
    id: "req-econ-1",
    authorId: "author-a",
    journalId: "journal-economics",
    departmentId: "economics",
  };
  const econRequest2 = {
    id: "req-econ-2",
    authorId: "author-a",
    journalId: "journal-economics",
    departmentId: "economics",
  };
  const socRequest = {
    id: "req-soc-1",
    authorId: "author-a",
    journalId: "journal-sociology",
    departmentId: "sociology",
  };
  const ajsbsRequest = {
    id: "req-ajsbs-1",
    authorId: "author-a",
    journalId: "journal-ajsbs",
    departmentId: null,
  };

  // Author can access all 4 independently
  assert.equal(canAccessRequest(author, econRequest), true);
  assert.equal(canAccessRequest(author, econRequest2), true);
  assert.equal(canAccessRequest(author, socRequest), true);
  assert.equal(canAccessRequest(author, ajsbsRequest), true);
});

test("faculty journal requests with null departmentId are managed strictly via journal scope", () => {
  const ajsbsRequest = {
    id: "req-ajsbs-1",
    authorId: "author-a",
    journalId: "journal-ajsbs",
    departmentId: null,
  };

  const ajsbsAdmin: RequestActor = {
    id: "admin-ajsbs",
    active: true,
    author: false,
    adminJournalIds: ["journal-ajsbs"],
  };

  const psychAdmin: RequestActor = {
    id: "admin-psych",
    active: true,
    author: false,
    adminJournalIds: ["journal-psychology"],
    adminDepartmentIds: ["psychology"],
  };

  assert.equal(canAccessRequest(ajsbsAdmin, ajsbsRequest), true);
  assert.equal(canManageRequest(ajsbsAdmin, ajsbsRequest), true);

  // Unrelated journal admin cannot access or manage faculty journal request
  assert.equal(canAccessRequest(psychAdmin, ajsbsRequest), false);
  assert.equal(canManageRequest(psychAdmin, ajsbsRequest), false);

  // Super admin can access and manage
  assert.equal(
    canAccessRequest({ ...psychAdmin, superAdmin: true }, ajsbsRequest),
    true,
  );
});

test("departmental request isolation prevents cross-journal access", () => {
  const socRequest = {
    id: "req-soc-1",
    authorId: "author-a",
    journalId: "journal-sociology",
    departmentId: "sociology",
  };

  const econAdmin: RequestActor = {
    id: "admin-econ",
    active: true,
    author: false,
    adminJournalIds: ["journal-economics"],
    adminDepartmentIds: ["economics"],
  };

  const socAdmin: RequestActor = {
    id: "admin-soc",
    active: true,
    author: false,
    adminJournalIds: ["journal-sociology"],
    adminDepartmentIds: ["sociology"],
  };

  assert.equal(canAccessRequest(socAdmin, socRequest), true);
  assert.equal(canAccessRequest(econAdmin, socRequest), false);
  assert.equal(
    canAccessRequest({ ...econAdmin, superAdmin: true }, socRequest),
    true,
  );
});

test("author request heading dynamically derives from journal identity without Psychology fallback", () => {
  function computeRequestHeading(req: {
    submission?: { title?: string | null } | null;
    department?: { name: string } | null;
    journal: { name: string };
  }) {
    return (
      req.submission?.title ??
      `${req.department?.name ?? req.journal.name} submission request`
    );
  }

  // 1. Library & Information Science request without title
  const lisRequest = {
    submission: null,
    department: { name: "Library & Information Science" },
    journal: { name: "Library & Information Science Journal Operations" },
  };
  assert.equal(
    computeRequestHeading(lisRequest),
    "Library & Information Science submission request",
  );

  // 2. Economics request without title
  const econRequest = {
    submission: null,
    department: { name: "Economics" },
    journal: { name: "Economics Journal Operations" },
  };
  assert.equal(
    computeRequestHeading(econRequest),
    "Economics submission request",
  );

  // 3. AJSBS Faculty journal request without title (department = null)
  const ajsbsRequest = {
    submission: null,
    department: null,
    journal: { name: "African Journal of Social and Behavioural Sciences" },
  };
  assert.equal(
    computeRequestHeading(ajsbsRequest),
    "African Journal of Social and Behavioural Sciences submission request",
  );

  // 4. Request with manuscript title
  const titledRequest = {
    submission: { title: "Empirical Studies on Monetary Policy" },
    department: { name: "Economics" },
    journal: { name: "Economics Journal Operations" },
  };
  assert.equal(
    computeRequestHeading(titledRequest),
    "Empirical Studies on Monetary Policy",
  );
});
