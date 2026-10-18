import type { NotificationType } from "@prisma/client";
import type {
  CreateNotificationInput,
  ListNotificationsOptions,
} from "./types";

export class NotificationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationValidationError";
  }
}

const VALID_NOTIFICATION_TYPES: Set<string> = new Set([
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
]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(val: unknown): boolean {
  if (typeof val !== "string") return false;
  return UUID_REGEX.test(val.trim());
}

export function isValidNotificationType(
  type: unknown,
): type is NotificationType {
  return typeof type === "string" && VALID_NOTIFICATION_TYPES.has(type);
}

export function isSafeInternalActionUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();

  // Must not be empty and must not exceed safe URL length
  if (!trimmed || trimmed.length > 2000) return false;

  // Must start with exactly one leading slash
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\")
  ) {
    return false;
  }

  // Reject backslashes anywhere in path
  if (trimmed.includes("\\")) {
    return false;
  }

  // Reject control characters (0x00 - 0x1F, 0x7F)
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return false;
  }

  // Reject dangerous pseudo-protocols or execution vectors
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("javascript:") ||
    lower.includes("data:") ||
    lower.includes("vbscript:")
  ) {
    return false;
  }

  // Validate parsing via URL parser with a standard dummy origin
  try {
    const parsed = new URL(trimmed, "http://localhost");
    // Ensure the origin did not get hijacked (e.g. by weird relative URLs)
    if (parsed.origin !== "http://localhost") return false;
    if (!parsed.pathname.startsWith("/")) return false;
  } catch {
    return false;
  }

  return true;
}

export function validateCreateNotificationInput(
  raw: unknown,
): CreateNotificationInput {
  if (!raw || typeof raw !== "object") {
    throw new NotificationValidationError(
      "Notification payload must be an object.",
    );
  }

  const data = raw as Partial<CreateNotificationInput>;

  // 1. userId
  if (
    !data.userId ||
    typeof data.userId !== "string" ||
    !isValidUuid(data.userId)
  ) {
    throw new NotificationValidationError(
      "Recipient userId must be a valid non-empty UUID string.",
    );
  }

  // 2. type
  if (!data.type || !isValidNotificationType(data.type)) {
    throw new NotificationValidationError(
      `Invalid notification type: ${String(data.type)}.`,
    );
  }

  // 3. title
  if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
    throw new NotificationValidationError("Notification title is required.");
  }
  const cleanTitle = data.title.trim();
  if (cleanTitle.length > 255) {
    throw new NotificationValidationError(
      "Notification title must not exceed 255 characters.",
    );
  }

  // 4. message
  if (
    !data.message ||
    typeof data.message !== "string" ||
    !data.message.trim()
  ) {
    throw new NotificationValidationError("Notification message is required.");
  }
  const cleanMessage = data.message.trim();
  if (cleanMessage.length > 2000) {
    throw new NotificationValidationError(
      "Notification message must not exceed 2000 characters.",
    );
  }

  // 5. actionUrl
  if (!data.actionUrl || !isSafeInternalActionUrl(data.actionUrl)) {
    throw new NotificationValidationError(
      "actionUrl must be a valid safe internal relative path (e.g. '/admin/submissions'). External protocols, protocol-relative paths, and javascript: schemes are rejected.",
    );
  }
  const cleanActionUrl = data.actionUrl.trim();

  // 6. Optional fields
  const journalId =
    typeof data.journalId === "string" && data.journalId.trim()
      ? data.journalId.trim()
      : null;

  const resourceType =
    typeof data.resourceType === "string" && data.resourceType.trim()
      ? data.resourceType.trim()
      : null;

  const resourceId =
    typeof data.resourceId === "string" && data.resourceId.trim()
      ? data.resourceId.trim()
      : null;

  const idempotencyKey =
    typeof data.idempotencyKey === "string" && data.idempotencyKey.trim()
      ? data.idempotencyKey.trim()
      : null;

  return {
    userId: data.userId.trim(),
    type: data.type,
    title: cleanTitle,
    message: cleanMessage,
    actionUrl: cleanActionUrl,
    journalId,
    resourceType,
    resourceId,
    idempotencyKey,
  };
}

export function validateListNotificationsOptions(
  options?: ListNotificationsOptions,
): Required<ListNotificationsOptions> {
  const filter = options?.filter === "unread" ? "unread" : "all";

  let page = 1;
  if (
    typeof options?.page === "number" &&
    Number.isInteger(options.page) &&
    options.page > 0
  ) {
    page = options.page;
  }

  let pageSize = 25;
  if (
    typeof options?.pageSize === "number" &&
    Number.isInteger(options.pageSize) &&
    options.pageSize > 0 &&
    options.pageSize <= 100
  ) {
    pageSize = options.pageSize;
  }

  return { filter, page, pageSize };
}
