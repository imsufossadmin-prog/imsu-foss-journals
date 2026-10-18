import type { NotificationType } from "@prisma/client";
import type {
  ListNotificationsOptions,
  NotificationListResult,
  NotificationRecord,
} from "./types";
import {
  isValidUuid,
  NotificationValidationError,
  validateCreateNotificationInput,
  validateListNotificationsOptions,
} from "./validation";

interface NotificationServiceClient {
  notification: {
    findUnique?: (args: {
      where: { idempotencyKey: string };
    }) => Promise<NotificationRecord | null>;
    findFirst: (args: {
      where: {
        id?: string;
        userId?: string;
        idempotencyKey?: string;
      };
    }) => Promise<NotificationRecord | null>;
    findMany: (args: {
      where: { userId: string; isRead?: boolean };
      orderBy?: { createdAt: "asc" | "desc" };
      skip?: number;
      take?: number;
    }) => Promise<NotificationRecord[]>;
    count: (args: {
      where: { userId: string; isRead?: boolean };
    }) => Promise<number>;
    create: (args: {
      data: {
        userId: string;
        journalId: string | null;
        type: NotificationType;
        title: string;
        message: string;
        actionUrl: string;
        resourceType: string | null;
        resourceId: string | null;
        idempotencyKey: string | null;
      };
    }) => Promise<NotificationRecord>;
    update: (args: {
      where: { id: string };
      data: { isRead: boolean; readAt: Date };
    }) => Promise<NotificationRecord>;
    updateMany: (args: {
      where: { userId: string; isRead?: boolean };
      data: { isRead: boolean; readAt: Date };
    }) => Promise<{ count: number }>;
  };
}

async function getClient(db?: unknown): Promise<NotificationServiceClient> {
  if (db && typeof db === "object") {
    return db as NotificationServiceClient;
  }
  const { prisma } = await import("@/lib/db/prisma");
  return prisma as unknown as NotificationServiceClient;
}

/**
 * Builds a deterministic idempotency key for an event.
 * Format: `${userId}:${type}:${resourceId || "global"}${eventQualifier ? `:${eventQualifier}` : ""}`
 */
export function generateIdempotencyKey(params: {
  userId: string;
  type: NotificationType;
  resourceId?: string | null;
  eventQualifier?: string | null;
}): string {
  const parts = [
    params.userId.trim(),
    params.type,
    params.resourceId?.trim() || "global",
  ];
  if (params.eventQualifier?.trim()) {
    parts.push(params.eventQualifier.trim());
  }
  return parts.join(":");
}

/**
 * Creates a persistent notification with validation and duplicate prevention.
 */
export async function createNotification(
  input: unknown,
  db?: unknown,
): Promise<{ notification: NotificationRecord; duplicate: boolean }> {
  const data = validateCreateNotificationInput(input);
  const client = await getClient(db);

  // 1. If an idempotencyKey is supplied, check if already exists to prevent duplicate writes
  if (data.idempotencyKey) {
    const existing = client.notification.findUnique
      ? await client.notification.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
        })
      : await client.notification.findFirst({
          where: { idempotencyKey: data.idempotencyKey },
        });

    if (existing) {
      return {
        notification: existing,
        duplicate: true,
      };
    }
  }

  // 2. Persist notification, handling potential unique constraint race conditions gracefully
  try {
    const created = await client.notification.create({
      data: {
        userId: data.userId,
        journalId: data.journalId ?? null,
        type: data.type,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        resourceType: data.resourceType ?? null,
        resourceId: data.resourceId ?? null,
        idempotencyKey: data.idempotencyKey ?? null,
      },
    });

    return {
      notification: created,
      duplicate: false,
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    // Check if error is a unique constraint violation on idempotencyKey (Prisma P2002)
    if (
      data.idempotencyKey &&
      (err?.code === "P2002" ||
        err?.message?.includes("idempotencyKey") ||
        err?.message?.includes("Unique constraint"))
    ) {
      const existing = client.notification.findUnique
        ? await client.notification.findUnique({
            where: { idempotencyKey: data.idempotencyKey },
          })
        : await client.notification.findFirst({
            where: { idempotencyKey: data.idempotencyKey },
          });

      if (existing) {
        return {
          notification: existing,
          duplicate: true,
        };
      }
    }
    throw error;
  }
}

/**
 * Retrieves the count of unread notifications for a user.
 * Fast, indexed query against (userId, isRead, createdAt).
 */
export async function getUnreadCount(
  userId: string,
  db?: unknown,
): Promise<number> {
  if (!isValidUuid(userId)) {
    throw new NotificationValidationError(
      "userId must be a valid UUID string to retrieve unread notification count.",
    );
  }

  const client = await getClient(db);
  return client.notification.count({
    where: {
      userId: userId.trim(),
      isRead: false,
    },
  });
}

/**
 * Lists paginated notifications for a user with unread and total counts.
 * Queries are executed concurrently to eliminate sequential waterfall delays.
 */
export async function listNotifications(
  userId: string,
  options?: ListNotificationsOptions,
  db?: unknown,
): Promise<NotificationListResult> {
  if (!isValidUuid(userId)) {
    throw new NotificationValidationError(
      "userId must be a valid UUID string to list notifications.",
    );
  }

  const { filter, page, pageSize } = validateListNotificationsOptions(options);
  const client = await getClient(db);

  const cleanUserId = userId.trim();
  const whereClause = {
    userId: cleanUserId,
    ...(filter === "unread" ? { isRead: false } : {}),
  };

  // Run queries concurrently via Promise.all to prevent remote waterfalls
  const [notifications, totalCount, unreadCount] = await Promise.all([
    client.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    client.notification.count({
      where: whereClause,
    }),
    filter === "unread"
      ? Promise.resolve(null)
      : client.notification.count({
          where: {
            userId: cleanUserId,
            isRead: false,
          },
        }),
  ]);

  const effectiveUnread =
    filter === "unread" ? totalCount : (unreadCount as number);

  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const hasMore = page < totalPages;

  return {
    notifications,
    totalCount,
    unreadCount: effectiveUnread,
    page,
    pageSize,
    totalPages,
    hasMore,
  };
}

/**
 * Marks a single notification as read, enforcing user ownership.
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
  db?: unknown,
): Promise<NotificationRecord | null> {
  if (
    !notificationId ||
    typeof notificationId !== "string" ||
    !notificationId.trim()
  ) {
    throw new NotificationValidationError("notificationId is required.");
  }
  if (!isValidUuid(userId)) {
    throw new NotificationValidationError("userId must be a valid UUID.");
  }

  const cleanId = notificationId.trim();
  const cleanUserId = userId.trim();
  const client = await getClient(db);

  // 1. Verify existence and ownership
  const existing = await client.notification.findFirst({
    where: {
      id: cleanId,
      userId: cleanUserId,
    },
  });

  if (!existing) {
    return null;
  }

  // 2. If already marked read, return immediately without an unnecessary write
  if (existing.isRead) {
    return existing;
  }

  // 3. Mark read and update timestamp
  const updated = await client.notification.update({
    where: { id: cleanId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return updated;
}

/**
 * Marks all unread notifications for a user as read.
 */
export async function markAllNotificationsAsRead(
  userId: string,
  db?: unknown,
): Promise<{ count: number }> {
  if (!isValidUuid(userId)) {
    throw new NotificationValidationError("userId must be a valid UUID.");
  }

  const cleanUserId = userId.trim();
  const client = await getClient(db);

  const result = await client.notification.updateMany({
    where: {
      userId: cleanUserId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { count: result.count };
}
