import assert from "node:assert/strict";
import test from "node:test";
import {
  getVapidConfig,
  validatePushSubscriptionInput,
  saveUserPushSubscription,
  removeUserPushSubscription,
  getUserPushSubscriptions,
  sendPushNotificationToSubscription,
  sendPushNotificationToUser,
  type StoredPushSubscription,
} from "@/lib/notifications/push-service";

const VALID_USER_ID = "762677c2-f2d8-4a88-b938-a2492d3ed7e4";
const OTHER_USER_ID = "11111111-2222-3333-4444-555555555555";

function createMockPushDb(initialSubscriptions: StoredPushSubscription[] = []) {
  const store = new Map<string, StoredPushSubscription>();

  for (const sub of initialSubscriptions) {
    store.set(sub.endpoint, { ...sub });
  }

  return {
    pushSubscription: {
      findMany: async ({ where }: { where: { userId: string } }) => {
        return Array.from(store.values()).filter(
          (s) => s.userId === where.userId,
        );
      },
      findFirst: async ({
        where,
      }: {
        where: { endpoint: string; userId?: string };
      }) => {
        const found = store.get(where.endpoint);
        if (!found) return null;
        if (where.userId && found.userId !== where.userId) return null;
        return { ...found };
      },
      upsert: async ({
        where,
        create,
        update,
      }: {
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
      }) => {
        const existing = store.get(where.endpoint);
        if (existing) {
          const updated: StoredPushSubscription = {
            ...existing,
            userId: update.userId,
            p256dh: update.p256dh,
            auth: update.auth,
            userAgent: update.userAgent ?? null,
            updatedAt: new Date(),
          };
          store.set(where.endpoint, updated);
          return updated;
        }

        const created: StoredPushSubscription = {
          id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          userId: create.userId,
          endpoint: create.endpoint,
          p256dh: create.p256dh,
          auth: create.auth,
          userAgent: create.userAgent ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.set(where.endpoint, created);
        return created;
      },
      deleteMany: async ({
        where,
      }: {
        where: { endpoint: string; userId?: string };
      }) => {
        let count = 0;
        for (const [key, val] of Array.from(store.entries())) {
          if (val.endpoint === where.endpoint) {
            if (!where.userId || val.userId === where.userId) {
              store.delete(key);
              count++;
            }
          }
        }
        return { count };
      },
    },
    _rawStore: store,
  };
}

test("getVapidConfig validates configuration and URL schemes safely", () => {
  const originalPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const originalPrivate = process.env.VAPID_PRIVATE_KEY;
  const originalSubject = process.env.VAPID_SUBJECT;

  try {
    // Missing variables throw
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    assert.throws(() => getVapidConfig(), /VAPID configuration is incomplete/);

    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
    delete process.env.VAPID_PRIVATE_KEY;
    assert.throws(() => getVapidConfig(), /VAPID configuration is incomplete/);

    process.env.VAPID_PRIVATE_KEY = "test-private-key";
    delete process.env.VAPID_SUBJECT;
    assert.throws(() => getVapidConfig(), /VAPID configuration is incomplete/);

    // Invalid subject scheme
    process.env.VAPID_SUBJECT = "javascript:alert(1)";
    assert.throws(
      () => getVapidConfig(),
      /must be either a mailto: URI or an https: URL/,
    );

    // Valid mailto:
    process.env.VAPID_SUBJECT = "mailto:admin@imsufoss.com";
    const confMailto = getVapidConfig();
    assert.strictEqual(confMailto.publicKey, "test-public-key");
    assert.strictEqual(confMailto.subject, "mailto:admin@imsufoss.com");

    // Valid https:
    process.env.VAPID_SUBJECT = "https://imsufoss.com";
    const confHttps = getVapidConfig();
    assert.strictEqual(confHttps.subject, "https://imsufoss.com");
  } finally {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalPublic;
    process.env.VAPID_PRIVATE_KEY = originalPrivate;
    process.env.VAPID_SUBJECT = originalSubject;
  }
});

test("validatePushSubscriptionInput enforces strict shape, HTTPS, and key requirements", () => {
  // Non-objects and null
  assert.throws(
    () => validatePushSubscriptionInput(null),
    /Expected an object/,
  );
  assert.throws(() => validatePushSubscriptionInput(""), /Expected an object/);
  assert.throws(() => validatePushSubscriptionInput(123), /Expected an object/);

  // Missing or non-HTTPS endpoint
  assert.throws(
    () => validatePushSubscriptionInput({}),
    /Missing or invalid endpoint/,
  );
  assert.throws(
    () =>
      validatePushSubscriptionInput({ endpoint: "http://insecure.com/push" }),
    /Endpoint must use HTTPS protocol/,
  );
  assert.throws(
    () => validatePushSubscriptionInput({ endpoint: "not-a-url" }),
    /Endpoint is not a valid absolute URL/,
  );

  // Missing keys
  assert.throws(
    () =>
      validatePushSubscriptionInput({
        endpoint: "https://fcm.googleapis.com/fcm/send/test1",
      }),
    /Missing cryptographic keys/,
  );
  assert.throws(
    () =>
      validatePushSubscriptionInput({
        endpoint: "https://fcm.googleapis.com/fcm/send/test1",
        keys: { p256dh: "", auth: "authkey" },
      }),
    /Missing or empty p256dh key/,
  );
  assert.throws(
    () =>
      validatePushSubscriptionInput({
        endpoint: "https://fcm.googleapis.com/fcm/send/test1",
        keys: { p256dh: "p256dhkey", auth: "   " },
      }),
    /Missing or empty auth key/,
  );

  // Valid payload
  const validated = validatePushSubscriptionInput({
    endpoint: "   https://fcm.googleapis.com/fcm/send/test1   ",
    keys: {
      p256dh: "  BNcR...key  ",
      auth: "  tBs8...auth  ",
    },
  });

  assert.strictEqual(
    validated.endpoint,
    "https://fcm.googleapis.com/fcm/send/test1",
  );
  assert.strictEqual(validated.keys.p256dh, "BNcR...key");
  assert.strictEqual(validated.keys.auth, "tBs8...auth");
});

test("saveUserPushSubscription upserts and binds subscription to authenticated user", async () => {
  const mockDb = createMockPushDb();

  const saved = await saveUserPushSubscription(
    VALID_USER_ID,
    {
      endpoint: "https://updates.push.apple.com/push/device-1",
      keys: {
        p256dh: "p256dh-sample-token",
        auth: "auth-sample-token",
      },
    },
    "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
    mockDb,
  );

  assert.strictEqual(saved.userId, VALID_USER_ID);
  assert.strictEqual(
    saved.endpoint,
    "https://updates.push.apple.com/push/device-1",
  );
  assert.strictEqual(saved.p256dh, "p256dh-sample-token");
  assert.strictEqual(
    saved.userAgent,
    "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
  );

  // Re-saving with updated key should update in-place without duplicate
  const updated = await saveUserPushSubscription(
    VALID_USER_ID,
    {
      endpoint: "https://updates.push.apple.com/push/device-1",
      keys: {
        p256dh: "p256dh-updated-token",
        auth: "auth-sample-token",
      },
    },
    null,
    mockDb,
  );

  assert.strictEqual(updated.p256dh, "p256dh-updated-token");
  assert.strictEqual(mockDb._rawStore.size, 1);
});

test("removeUserPushSubscription strictly scopes deletion to requesting user", async () => {
  const initial: StoredPushSubscription = {
    id: "sub-1",
    userId: VALID_USER_ID,
    endpoint: "https://fcm.googleapis.com/fcm/send/valid-sub",
    p256dh: "key-1",
    auth: "auth-1",
    userAgent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDb = createMockPushDb([initial]);

  // Attempting to remove as a different user fails to delete the record
  const removedByOther = await removeUserPushSubscription(
    OTHER_USER_ID,
    initial.endpoint,
    mockDb,
  );
  assert.strictEqual(removedByOther, false);
  assert.strictEqual(mockDb._rawStore.size, 1);

  // Removing as owner succeeds
  const removedByOwner = await removeUserPushSubscription(
    VALID_USER_ID,
    initial.endpoint,
    mockDb,
  );
  assert.strictEqual(removedByOwner, true);
  assert.strictEqual(mockDb._rawStore.size, 0);
});

test("getUserPushSubscriptions returns user-scoped active subscriptions", async () => {
  const sub1: StoredPushSubscription = {
    id: "sub-1",
    userId: VALID_USER_ID,
    endpoint: "https://fcm.googleapis.com/fcm/send/sub-1",
    p256dh: "k1",
    auth: "a1",
    userAgent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const sub2: StoredPushSubscription = {
    id: "sub-2",
    userId: OTHER_USER_ID,
    endpoint: "https://fcm.googleapis.com/fcm/send/sub-2",
    p256dh: "k2",
    auth: "a2",
    userAgent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDb = createMockPushDb([sub1, sub2]);

  const userSubs = await getUserPushSubscriptions(VALID_USER_ID, mockDb);
  assert.strictEqual(userSubs.length, 1);
  assert.strictEqual(userSubs[0].id, "sub-1");
});

test("sendPushNotificationToSubscription cleans up expired subscriptions on 410 Gone", async () => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "dummy-public-key";
  process.env.VAPID_PRIVATE_KEY = "dummy-private-key";
  process.env.VAPID_SUBJECT = "mailto:operator@imsufoss.com";

  const expiredSub: StoredPushSubscription = {
    id: "sub-expired",
    userId: VALID_USER_ID,
    endpoint: "https://fcm.googleapis.com/fcm/send/expired-sub",
    p256dh: "expired-key",
    auth: "expired-auth",
    userAgent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDb = createMockPushDb([expiredSub]);

  type MockPushSender = {
    setVapidDetails?: () => void;
    sendNotification: (
      sub: unknown,
      payload: string,
      options: unknown,
    ) => Promise<{ statusCode: number }>;
  };

  // Mock webpush sending function that rejects with 410 Gone
  const mockWebpush: MockPushSender = {
    setVapidDetails: () => {},
    sendNotification: async () => {
      const err = new Error("Subscription expired or unsubscribed") as Error & {
        statusCode?: number;
      };
      err.statusCode = 410;
      throw err;
    },
  };

  const result = await sendPushNotificationToSubscription(
    expiredSub,
    {
      title: "Test Alert",
      body: "Test Body",
    },
    mockDb,
    mockWebpush,
  );

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.statusCode, 410);
  assert.strictEqual(result.cleanedUp, true);
  // Endpoint should be purged from database
  assert.strictEqual(mockDb._rawStore.size, 0);
});

test("sendPushNotificationToUser delivers to all active user subscriptions", async () => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "dummy-public-key";
  process.env.VAPID_PRIVATE_KEY = "dummy-private-key";
  process.env.VAPID_SUBJECT = "mailto:operator@imsufoss.com";

  const activeSub: StoredPushSubscription = {
    id: "sub-active",
    userId: VALID_USER_ID,
    endpoint: "https://fcm.googleapis.com/fcm/send/active-sub",
    p256dh: "active-key",
    auth: "active-auth",
    userAgent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDb = createMockPushDb([activeSub]);

  let deliveredPayload: string | null = null;
  const mockWebpush = {
    setVapidDetails: () => {},
    sendNotification: async (_sub: unknown, payload: string) => {
      deliveredPayload = payload;
      return { statusCode: 201 };
    },
  };

  const result = await sendPushNotificationToUser(
    VALID_USER_ID,
    {
      title: "IMSufoss Journals Test",
      body: "Browser push notifications are working.",
      actionUrl: "/admin",
    },
    mockDb,
    mockWebpush,
  );

  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.sent, 1);
  assert.strictEqual(result.failed, 0);
  assert.ok(deliveredPayload);
  const parsed = JSON.parse(deliveredPayload);
  assert.strictEqual(parsed.title, "IMSufoss Journals Test");
  assert.strictEqual(parsed.actionUrl, "/admin");
});
