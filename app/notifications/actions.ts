"use server";

import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/authorization";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/notifications/service";
import {
  getVapidConfig,
  getUserPushSubscriptions,
  removeUserPushSubscription,
  saveUserPushSubscription,
  sendPushNotificationToUser,
} from "@/lib/notifications/push-service";
import type {
  ListNotificationsOptions,
  NotificationListResult,
  NotificationRecord,
} from "@/lib/notifications/types";

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Retrieves the unread notification count for the currently authenticated user.
 */
export async function getUnreadNotificationCountAction(): Promise<{
  count: number;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isActive) {
      return { count: 0, error: "Unauthorized" };
    }

    const count = await getUnreadCount(user.id);
    return { count };
  } catch (error) {
    console.error(
      "[Notification Action] Failed to fetch unread count:",
      error instanceof Error ? error.message : String(error),
    );
    return { count: 0, error: "Failed to load notification count." };
  }
}

/**
 * Lists paginated notifications for the currently authenticated user.
 */
export async function listUserNotificationsAction(
  options?: ListNotificationsOptions,
): Promise<ActionResponse<NotificationListResult>> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isActive) {
      return { success: false, error: "Unauthorized" };
    }

    // Enforce bounds: max page size 25
    const boundedPageSize = Math.min(
      Math.max(1, Number(options?.pageSize) || 25),
      25,
    );
    const boundedPage = Math.max(1, Number(options?.page) || 1);
    const filter = options?.filter === "unread" ? "unread" : "all";

    const result = await listNotifications(user.id, {
      filter,
      page: boundedPage,
      pageSize: boundedPageSize,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      "[Notification Action] Failed to list notifications:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      success: false,
      error: "Unable to retrieve notifications. Please try again.",
    };
  }
}

/**
 * Marks a single notification as read, enforcing user ownership.
 */
export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResponse<NotificationRecord>> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isActive) {
      return { success: false, error: "Unauthorized" };
    }

    if (
      !notificationId ||
      typeof notificationId !== "string" ||
      !notificationId.trim()
    ) {
      return { success: false, error: "Invalid notification ID." };
    }

    const updated = await markNotificationAsRead(
      notificationId.trim(),
      user.id,
    );

    if (!updated) {
      return { success: false, error: "Notification not found." };
    }

    return { success: true, data: updated };
  } catch (error) {
    console.error(
      "[Notification Action] Failed to mark notification read:",
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, error: "Unable to update notification." };
  }
}

/**
 * Marks all unread notifications for the currently authenticated user as read.
 */
export async function markAllNotificationsReadAction(): Promise<
  ActionResponse<{ count: number }>
> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isActive) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await markAllNotificationsAsRead(user.id);
    return { success: true, data: result };
  } catch (error) {
    console.error(
      "[Notification Action] Failed to mark all notifications read:",
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, error: "Unable to mark notifications as read." };
  }
}

/**
 * Persists an active browser push subscription for the currently authenticated user.
 */
export async function savePushSubscriptionAction(
  subscriptionInput: unknown,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isActive) {
      return { success: false, error: "Unauthorized" };
    }

    const headerList = await headers();
    const userAgent = headerList.get("user-agent");

    const saved = await saveUserPushSubscription(
      user.id,
      subscriptionInput,
      userAgent,
    );

    return { success: true, data: { id: saved.id } };
  } catch (error) {
    console.error(
      "[Push Action] Failed to save push subscription:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save push subscription.",
    };
  }
}

/**
 * Removes an active push subscription owned by the currently authenticated user.
 */
export async function removePushSubscriptionAction(
  endpoint: string,
): Promise<ActionResponse<{ removed: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isActive) {
      return { success: false, error: "Unauthorized" };
    }

    if (!endpoint || typeof endpoint !== "string") {
      return { success: false, error: "Invalid subscription endpoint." };
    }

    const removed = await removeUserPushSubscription(user.id, endpoint);
    return { success: true, data: { removed } };
  } catch (error) {
    console.error(
      "[Push Action] Failed to remove push subscription:",
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, error: "Unable to remove push subscription." };
  }
}

/**
 * Retrieves whether the authenticated user has active subscriptions in the database
 * and returns the public VAPID key.
 */
export async function getPushSubscriptionStatusAction(): Promise<
  ActionResponse<{
    hasSubscription: boolean;
    vapidPublicKey: string;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isActive) {
      return { success: false, error: "Unauthorized" };
    }

    const vapid = getVapidConfig();
    const subscriptions = await getUserPushSubscriptions(user.id);

    return {
      success: true,
      data: {
        hasSubscription: subscriptions.length > 0,
        vapidPublicKey: vapid.publicKey,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to determine push notification status.",
    };
  }
}

/**
 * Development-only action to send a test browser push alert to the authenticated user.
 */
export async function sendTestPushNotificationAction(): Promise<
  ActionResponse<{ sent: number; failed: number }>
> {
  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Test push notifications are restricted to development mode.",
    };
  }

  try {
    const user = await getCurrentUser();
    if (!user || !user.isActive) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await sendPushNotificationToUser(user.id, {
      title: "IMSufoss Journals Test",
      body: "Browser push notifications are working.",
      actionUrl: "/admin",
      tag: "imsufoss-dev-test",
    });

    if (result.total === 0) {
      return {
        success: false,
        error:
          "No active push subscription found for your account. Enable desktop alerts first.",
      };
    }

    if (result.sent === 0 && result.failed > 0) {
      return {
        success: false,
        error:
          "Push service rejected the test notification. The subscription may have expired.",
      };
    }

    return {
      success: true,
      data: { sent: result.sent, failed: result.failed },
    };
  } catch (error) {
    console.error(
      "[Push Action] Failed to send test push:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to deliver test push notification.",
    };
  }
}
