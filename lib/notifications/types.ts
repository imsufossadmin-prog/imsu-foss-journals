import type { NotificationType } from "@prisma/client";

export type { NotificationType };

export interface NotificationRecord {
  id: string;
  userId: string;
  journalId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string;
  resourceType: string | null;
  resourceId: string | null;
  idempotencyKey: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string;
  journalId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  idempotencyKey?: string | null;
}

export interface ListNotificationsOptions {
  filter?: "all" | "unread";
  page?: number;
  pageSize?: number;
}

export interface NotificationListResult {
  notifications: NotificationRecord[];
  totalCount: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface NotificationRecipient {
  userId: string;
  role?: string;
}
