import "server-only";

import webpush from "web-push";
import { isValidUuid } from "./validation";

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface ClientPushSubscriptionInput {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface StoredPushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PushPayload {
  title: string;
  body: string;
  actionUrl?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

export interface PushDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  cleanedUp?: boolean;
}

interface PushServiceClient {
  pushSubscription: {
    findMany: (args: {
      where: { userId: string };
    }) => Promise<StoredPushSubscription[]>;
    findFirst: (args: {
      where: { endpoint: string; userId?: string };
    }) => Promise<StoredPushSubscription | null>;
    upsert: (args: {
      where: { endpoint: string };
      create: {
        userId: string;
        endpoint: string;
        p256dh: string;
        auth: string;
        userAgent?: string | null;
      };
      update: {
        userId: string;
        p256dh: string;
        auth: string;
        userAgent?: string | null;
      };
    }) => Promise<StoredPushSubscription>;
    deleteMany: (args: {
      where: { endpoint: string; userId?: string };
    }) => Promise<{ count: number }>;
  };
}

async function getClient(db?: unknown): Promise<PushServiceClient> {
  if (db && typeof db === "object") {
    return db as PushServiceClient;
  }
  const { prisma } = await import("@/lib/db/prisma");
  return prisma as unknown as PushServiceClient;
}

/**
 * Validates and returns the active VAPID configuration.
 * Does not expose or leak private key values.
 */
export function getVapidConfig(): VapidConfig {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Web Push VAPID configuration is incomplete. NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT are required.",
    );
  }

  // Basic format sanity checks
  if (!subject.startsWith("mailto:") && !subject.startsWith("https://")) {
    throw new Error(
      "VAPID_SUBJECT must be either a mailto: URI or an https: URL.",
    );
  }

  return { publicKey, privateKey, subject };
}

/**
 * Validates browser subscription payload structure.
 */
export function validatePushSubscriptionInput(
  input: unknown,
): ClientPushSubscriptionInput {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid push subscription: Expected an object.");
  }

  const { endpoint, keys } = input as Record<string, unknown>;

  if (typeof endpoint !== "string" || !endpoint.trim()) {
    throw new Error("Invalid push subscription: Missing or invalid endpoint.");
  }

  try {
    const url = new URL(endpoint.trim());
    if (url.protocol !== "https:") {
      throw new Error(
        "Invalid push subscription: Endpoint must use HTTPS protocol.",
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("HTTPS")) throw err;
    throw new Error(
      "Invalid push subscription: Endpoint is not a valid absolute URL.",
    );
  }

  if (!keys || typeof keys !== "object") {
    throw new Error("Invalid push subscription: Missing cryptographic keys.");
  }

  const { p256dh, auth } = keys as Record<string, unknown>;

  if (typeof p256dh !== "string" || !p256dh.trim()) {
    throw new Error("Invalid push subscription: Missing or empty p256dh key.");
  }

  if (typeof auth !== "string" || !auth.trim()) {
    throw new Error("Invalid push subscription: Missing or empty auth key.");
  }

  return {
    endpoint: endpoint.trim(),
    keys: {
      p256dh: p256dh.trim(),
      auth: auth.trim(),
    },
  };
}

/**
 * Persists or updates a push subscription scoped to the authenticated user.
 */
export async function saveUserPushSubscription(
  userId: string,
  rawInput: unknown,
  userAgent?: string | null,
  db?: unknown,
): Promise<StoredPushSubscription> {
  if (!isValidUuid(userId)) {
    throw new Error("userId must be a valid UUID.");
  }

  const subscription = validatePushSubscriptionInput(rawInput);
  const client = await getClient(db);

  return client.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId: userId.trim(),
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent?.slice(0, 500) ?? null,
    },
    update: {
      userId: userId.trim(),
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent?.slice(0, 500) ?? null,
    },
  });
}

/**
 * Removes an active push subscription owned by the authenticated user.
 */
export async function removeUserPushSubscription(
  userId: string,
  endpoint: string,
  db?: unknown,
): Promise<boolean> {
  if (!isValidUuid(userId) || !endpoint || typeof endpoint !== "string") {
    return false;
  }

  const client = await getClient(db);
  const res = await client.pushSubscription.deleteMany({
    where: {
      userId: userId.trim(),
      endpoint: endpoint.trim(),
    },
  });

  return res.count > 0;
}

/**
 * Retrieves all stored push subscriptions for an authenticated user.
 */
export async function getUserPushSubscriptions(
  userId: string,
  db?: unknown,
): Promise<StoredPushSubscription[]> {
  if (!isValidUuid(userId)) {
    return [];
  }

  const client = await getClient(db);
  return client.pushSubscription.findMany({
    where: { userId: userId.trim() },
  });
}

/**
 * Sends a Web Push notification to a specific stored subscription.
 * Automatically cleans up expired/unregistered subscriptions (HTTP 404 or 410).
 */
export async function sendPushNotificationToSubscription(
  subscription: StoredPushSubscription,
  payload: PushPayload,
  db?: unknown,
  pushSender?: {
    setVapidDetails?: (
      subject: string,
      publicKey: string,
      privateKey: string,
    ) => void;
    sendNotification: (
      sub: unknown,
      payload: string,
      options: unknown,
    ) => Promise<{ statusCode: number }>;
  },
): Promise<PushDeliveryResult> {
  const sender = pushSender || webpush;
  const vapid = getVapidConfig();

  if (sender.setVapidDetails) {
    sender.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const payloadString = JSON.stringify({
    title: payload.title || "IMSUFOSS Notification",
    body: payload.body || "",
    actionUrl: payload.actionUrl || "/admin",
    icon: payload.icon || "/icon.svg",
    badge: payload.badge || "/icon.svg",
    tag: payload.tag || "imsufoss-alert",
  });

  try {
    const response = await sender.sendNotification(
      pushSubscription,
      payloadString,
      {
        TTL: 60 * 60 * 24, // 24 hours
        urgency: "normal",
      },
    );

    return {
      success: true,
      statusCode: response.statusCode,
    };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    const statusCode = err.statusCode;

    // HTTP 404 Not Found or HTTP 410 Gone means the subscription is no longer active
    if (statusCode === 404 || statusCode === 410) {
      const client = await getClient(db);
      await client.pushSubscription.deleteMany({
        where: {
          endpoint: subscription.endpoint,
          userId: subscription.userId,
        },
      });

      return {
        success: false,
        statusCode,
        error: "Subscription expired or unsubscribed on browser push service.",
        cleanedUp: true,
      };
    }

    return {
      success: false,
      statusCode,
      error:
        typeof err.message === "string"
          ? err.message
          : "Web Push delivery failed.",
      cleanedUp: false,
    };
  }
}

/**
 * Sends a Web Push notification to all active subscriptions of a user.
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: PushPayload,
  db?: unknown,
  pushSender?: {
    setVapidDetails?: (
      subject: string,
      publicKey: string,
      privateKey: string,
    ) => void;
    sendNotification: (
      sub: unknown,
      payload: string,
      options: unknown,
    ) => Promise<{ statusCode: number }>;
  },
): Promise<{ sent: number; failed: number; total: number }> {
  const subscriptions = await getUserPushSubscriptions(userId, db);

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, total: 0 };
  }

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendPushNotificationToSubscription(
        sub,
        payload,
        db,
        pushSender,
      );
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }),
  );

  return { sent, failed, total: subscriptions.length };
}
