"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};

// Temporary flag: Web Push controls paused pending complete browser push verification
const SHOW_WEB_PUSH_CONTROLS = false;

function isIosOrIpadOs(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isMacTouch =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIos || isMacTouch;
}

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as unknown as { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function getIosRestrictedClient(): boolean {
  return isIosOrIpadOs() && !isStandalonePwa();
}

function getPushSupportedClient(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function getPushPermissionClient(): NotificationPermission | "unsupported" {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  return Notification.permission;
}
import { useRouter } from "next/navigation";

import {
  listUserNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  getPushSubscriptionStatusAction,
  savePushSubscriptionAction,
  removePushSubscriptionAction,
  sendTestPushNotificationAction,
} from "@/app/notifications/actions";
import type { NotificationRecord } from "@/lib/notifications/types";
import {
  formatRelativeTime,
  getNotificationMeta,
  type NotificationMeta,
} from "@/lib/notifications/formatters";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export { formatRelativeTime, getNotificationMeta, type NotificationMeta };

export type NotificationDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
};

export function NotificationDrawer({
  isOpen,
  onClose,
  onUnreadCountChange,
}: NotificationDrawerProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Browser Web Push capability and state
  const isIosRestricted = useSyncExternalStore(
    emptySubscribe,
    getIosRestrictedClient,
    () => false,
  );
  const pushSupported = useSyncExternalStore(
    emptySubscribe,
    getPushSupportedClient,
    () => false,
  );
  const browserPushPermission = useSyncExternalStore(
    emptySubscribe,
    getPushPermissionClient,
    () => "unsupported" as const,
  );
  const [pushPermissionOverride, setPushPermissionOverride] =
    useState<NotificationPermission | null>(null);
  const pushPermission = pushPermissionOverride ?? browserPushPermission;
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const [isPushSubscribing, setIsPushSubscribing] = useState<boolean>(false);
  const [isTestingPush, setIsTestingPush] = useState<boolean>(false);
  const [pushFeedback, setPushFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  // Mount state for safe client-side portal rendering
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Smooth slide-in and slide-out animation states
  const [shouldRender, setShouldRender] = useState<boolean>(isOpen);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  // If opening, ensure component renders immediately
  if (isOpen && !shouldRender) {
    setShouldRender(true);
  }

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onUnreadCountChangeRef = useRef(onUnreadCountChange);

  useEffect(() => {
    onUnreadCountChangeRef.current = onUnreadCountChange;
  }, [onUnreadCountChange]);

  // Handle gentle open/close CSS animation transitions (crisp 300ms duration)
  useEffect(() => {
    if (isOpen) {
      const frameId = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(frameId);
    } else {
      const frameId = requestAnimationFrame(() => {
        setIsVisible(false);
      });
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  // Lock background body scroll when drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Keyboard navigation: Escape key closes the drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Load initial notifications whenever drawer opens or active filter changes
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    async function loadInitial() {
      setIsLoading(true);
      setError(null);
      setPage(1);

      const res = await listUserNotificationsAction({
        filter,
        page: 1,
        pageSize: 25,
      });

      if (!active) return;

      setIsLoading(false);
      if (res.success && res.data) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
        setHasMore(res.data.hasMore);
        onUnreadCountChangeRef.current?.(res.data.unreadCount);
      } else {
        setError(res.error || "Unable to load notifications at this time.");
      }
    }

    void loadInitial();

    return () => {
      active = false;
    };
  }, [isOpen, filter]);

  // Load more notifications for pagination
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    const nextPage = page + 1;
    setIsLoadingMore(true);

    const res = await listUserNotificationsAction({
      filter,
      page: nextPage,
      pageSize: 25,
    });

    setIsLoadingMore(false);
    if (res.success && res.data) {
      setNotifications((prev) => [...prev, ...res.data!.notifications]);
      setPage(nextPage);
      setHasMore(res.data.hasMore);
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (notifId: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notifId
          ? { ...item, isRead: true, readAt: new Date() }
          : item,
      ),
    );
    const newUnread = Math.max(0, unreadCount - 1);
    setUnreadCount(newUnread);
    onUnreadCountChangeRef.current?.(newUnread);

    await markNotificationReadAction(notifId);
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, isRead: true, readAt: new Date() })),
    );
    setUnreadCount(0);
    onUnreadCountChangeRef.current?.(0);

    await markAllNotificationsReadAction();
  };

  // Click entire notification card: mark read, close drawer, navigate smoothly
  const handleNotificationClick = async (notif: NotificationRecord) => {
    if (!notif.isRead) {
      void handleMarkAsRead(notif.id);
    }
    onClose();
    router.push(notif.actionUrl);
  };

  // Check browser push notification active subscription status when drawer opens
  useEffect(() => {
    if (!isOpen || !pushSupported || isIosRestricted) return;

    let active = true;

    async function checkPushStatus() {
      try {
        const res = await getPushSubscriptionStatusAction();
        if (!active) return;

        if (res.success && res.data) {
          setVapidPublicKey(res.data.vapidPublicKey);
          if ("serviceWorker" in navigator) {
            // Use getRegistration() so we never hang if no service worker has been registered yet
            const reg = await navigator.serviceWorker.getRegistration();
            const sub = reg ? await reg.pushManager.getSubscription() : null;
            setIsPushSubscribed(Boolean(sub) && res.data.hasSubscription);
          } else {
            setIsPushSubscribed(res.data.hasSubscription);
          }
        }
      } catch (err) {
        console.warn("[Push] Status query error:", err);
      }
    }

    void checkPushStatus();

    return () => {
      active = false;
    };
  }, [isOpen, pushSupported, isIosRestricted]);

  // Enable Web Push alerts
  const handleEnablePush = async () => {
    if (isPushSubscribing) return;
    setIsPushSubscribing(true);
    setPushFeedback(null);

    try {
      if (!pushSupported) {
        throw new Error(
          "Push notifications are not supported in this browser.",
        );
      }

      if (typeof window !== "undefined" && !window.isSecureContext) {
        throw new Error(
          "Push notifications require a secure connection (HTTPS or http://localhost).",
        );
      }

      let key =
        vapidPublicKey ||
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
        null;

      if (!key) {
        const statusRes = await getPushSubscriptionStatusAction();
        if (!statusRes.success || !statusRes.data?.vapidPublicKey) {
          throw new Error(
            statusRes.error ||
              "Unable to retrieve VAPID configuration from server.",
          );
        }
        key = statusRes.data.vapidPublicKey;
        setVapidPublicKey(key);
      }

      // Explicit permission request triggered by user click
      const permission = await Notification.requestPermission();
      setPushPermissionOverride(permission);

      if (permission === "denied") {
        throw new Error(
          "Notifications are blocked in your browser settings. Please allow notifications for this site to receive alerts.",
        );
      }

      if (permission !== "granted") {
        throw new Error(
          "Notification permission was dismissed or not granted.",
        );
      }

      // Register the service worker at root scope
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      // Wait for registration to become ready with a safe 3s timeout guard
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);

      const appServerKey = urlBase64ToUint8Array(key);
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey as unknown as BufferSource,
        });
      }

      if (!subscription) {
        throw new Error(
          "Browser push service failed to generate a subscription.",
        );
      }

      const saveRes = await savePushSubscriptionAction(subscription.toJSON());
      if (!saveRes.success) {
        throw new Error(
          saveRes.error || "Failed to save push subscription to your account.",
        );
      }

      setIsPushSubscribed(true);
      setPushFeedback({
        type: "success",
        message: "Push notifications enabled successfully.",
      });
    } catch (err) {
      console.error("[Push] Enable alerts error:", err);
      setPushFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to enable notifications. Please try again.",
      });
    } finally {
      setIsPushSubscribing(false);
    }
  };

  // Disable Web Push alerts
  const handleDisablePush = async () => {
    if (isPushSubscribing) return;
    setIsPushSubscribing(true);
    setPushFeedback(null);

    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();
          await removePushSubscriptionAction(endpoint);
        }
      }
      setIsPushSubscribed(false);
      setPushFeedback({
        type: "success",
        message: "Push notifications disabled.",
      });
    } catch (err) {
      console.error("[Push] Disable alerts error:", err);
      setPushFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to disable notifications.",
      });
    } finally {
      setIsPushSubscribing(false);
    }
  };

  // Send a test browser push alert (dev only)
  const handleSendTestPush = async () => {
    if (isTestingPush) return;
    setIsTestingPush(true);
    setPushFeedback(null);

    try {
      const res = await sendTestPushNotificationAction();
      if (!res.success) {
        throw new Error(res.error || "Failed to send test push notification.");
      }
      setPushFeedback({
        type: "success",
        message: "Test alert dispatched! Look for your system notification.",
      });
    } catch (err) {
      console.error("[Push] Test alert error:", err);
      setPushFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Unable to deliver test alert.",
      });
    } finally {
      setIsTestingPush(false);
    }
  };

  if (!mounted || !shouldRender) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Subtle backdrop overlay with gentle fade transition */}
      <div
        className={`fixed inset-0 bg-black/60 transition-opacity duration-300 ease-out will-change-[opacity] motion-reduce:transition-none ${
          isVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Slide-out drawer panel with calm, controlled deceleration */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex h-dvh max-h-screen w-full flex-col border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none sm:max-w-md ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header: non-shrinking fixed height */}
        <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--color-border)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <h2
              id="notification-drawer-title"
              className="font-serif text-lg font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-xl"
            >
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-400">
                {unreadCount} unread
              </span>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-[color:var(--color-subtle)] transition hover:bg-[color:var(--color-surface-raised)] hover:text-[color:var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus)]"
            aria-label="Close notifications drawer"
          >
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Filter Controls & Bulk Action Header: non-shrinking fixed size */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--color-border)]/60 bg-[color:var(--color-surface-raised)]/40 px-5 py-3 sm:px-6">
          <div className="flex items-center gap-1 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`cursor-pointer rounded-lg px-3 py-1 font-medium transition ${
                filter === "all"
                  ? "bg-emerald-500 font-semibold text-black shadow-xs"
                  : "text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`cursor-pointer rounded-lg px-3 py-1 font-medium transition ${
                filter === "unread"
                  ? "bg-emerald-500 font-semibold text-black shadow-xs"
                  : "text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              }`}
            >
              Unread {unreadCount > 0 ? `(${unreadCount})` : ""}
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-emerald-400 transition hover:text-emerald-300 hover:underline focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus)]"
            >
              <svg
                className="size-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Web Push Control Bar (Paused pending verification) */}
        {SHOW_WEB_PUSH_CONTROLS &&
          (isIosRestricted ? (
            <div className="shrink-0 border-b border-[color:var(--color-border)]/60 bg-[color:var(--color-surface-raised)]/30 px-5 py-3 sm:px-6">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-400">
                  <svg
                    className="size-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-semibold text-[color:var(--color-foreground)]">
                    Push alerts on iPhone &amp; iPad
                  </p>
                  <p className="mt-1 leading-relaxed text-[color:var(--color-subtle)]">
                    iOS requires adding IMSUFOSS to your Home Screen for push
                    alerts. Tap the Share icon{" "}
                    <span className="font-mono font-bold text-[color:var(--color-foreground)]">
                      ⎋
                    </span>{" "}
                    in Safari, choose{" "}
                    <span className="font-medium text-[color:var(--color-foreground)]">
                      &quot;Add to Home Screen&quot;
                    </span>
                    , then launch from your Home Screen.
                  </p>
                </div>
              </div>
            </div>
          ) : pushSupported ? (
            <div className="shrink-0 border-b border-[color:var(--color-border)]/60 bg-[color:var(--color-surface-raised)]/20 px-5 py-2.5 sm:px-6">
              {pushPermission === "denied" ? (
                <div className="flex items-start gap-2 text-xs text-rose-300">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-rose-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      Notifications blocked in browser settings
                    </p>
                    <p className="mt-0.5 text-[11px] text-[color:var(--color-subtle)]">
                      To receive alerts, allow notifications for this site in
                      your browser address bar.
                    </p>
                  </div>
                </div>
              ) : isPushSubscribed ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                      </span>
                      <span className="font-medium text-emerald-400">
                        Push alerts active
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {process.env.NODE_ENV !== "production" && (
                        <button
                          type="button"
                          onClick={handleSendTestPush}
                          disabled={isTestingPush}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20 active:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isTestingPush ? "Sending..." : "Send test alert"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleDisablePush}
                        disabled={isPushSubscribing}
                        className="cursor-pointer text-[11px] text-[color:var(--color-subtle)] transition hover:text-[color:var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Disable
                      </button>
                    </div>
                  </div>
                  {pushFeedback && (
                    <p
                      className={`text-[11px] font-medium ${
                        pushFeedback.type === "success"
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }`}
                    >
                      {pushFeedback.message}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-[color:var(--color-subtle)]">
                      <svg
                        className="size-3.5 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                        />
                      </svg>
                      <span>Push alerts</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      disabled={isPushSubscribing}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/25 active:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPushSubscribing ? "Enabling..." : "Enable alerts"}
                    </button>
                  </div>
                  {pushFeedback && (
                    <p
                      className={`text-[11px] font-medium ${
                        pushFeedback.type === "success"
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }`}
                    >
                      {pushFeedback.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : null)}

        {/* Scrollable Notifications Stack: flex-1 with min-h-0 and overscroll-contain */}
        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]/60 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-[color:var(--color-border)]" />
                      <div className="h-3 w-20 rounded bg-[color:var(--color-border)]" />
                    </div>
                    <div className="h-3 w-12 rounded bg-[color:var(--color-border)]" />
                  </div>
                  <div className="mt-3 h-4 w-3/4 rounded bg-[color:var(--color-border)]" />
                  <div className="mt-2 h-3 w-full rounded bg-[color:var(--color-border)]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-center">
              <p className="text-xs font-medium text-rose-300">{error}</p>
              <button
                type="button"
                onClick={() => setFilter(filter)}
                className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
              >
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center">
              {filter === "unread" ? (
                <>
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-inner">
                    <svg
                      className="size-7"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.8"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />
                    </svg>
                  </div>
                  <h3 className="mt-4 font-serif text-base font-medium text-[color:var(--color-foreground)]">
                    All caught up
                  </h3>
                  <p className="mx-auto mt-1.5 max-w-xs text-xs text-[color:var(--color-subtle)]">
                    You have acknowledged all active notifications.
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-subtle)] shadow-inner">
                    <svg
                      className="size-7"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                      />
                    </svg>
                  </div>
                  <h3 className="mt-4 font-serif text-base font-medium text-[color:var(--color-foreground)]">
                    No notifications yet
                  </h3>
                  <p className="mx-auto mt-1.5 max-w-xs text-xs text-[color:var(--color-subtle)]">
                    When manuscript updates, editorial reviews, or queries
                    arrive, they will appear here.
                  </p>
                </>
              )}
            </div>
          ) : (
            notifications.map((notif) => {
              const meta = getNotificationMeta(notif.type);
              return (
                <div
                  key={notif.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotificationClick(notif)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void handleNotificationClick(notif);
                    }
                  }}
                  className={`group relative flex cursor-pointer flex-col rounded-2xl border p-4 transition-all duration-200 select-none ${
                    notif.isRead
                      ? "border-[color:var(--color-border)]/70 bg-[color:var(--color-surface)]/70 opacity-80 hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-raised)] hover:opacity-100"
                      : "border-emerald-500/40 bg-[color:var(--color-surface-raised)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4),0_0_0_1px_rgba(16,185,129,0.12)] hover:border-emerald-400/60 hover:bg-[color:var(--color-surface-strong)]"
                  }`}
                >
                  {/* Top Header Row: Icon + Badge + Relative Time + Indicator */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex size-7 items-center justify-center rounded-lg border ${meta.badgeClass}`}
                      >
                        {meta.icon}
                      </div>
                      <span className="font-mono text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-[color:var(--color-subtle)]">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                      {!notif.isRead && (
                        <span
                          className="relative flex size-2"
                          title="Unread alert"
                        >
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="mt-2.5">
                    <h3 className="text-sm font-semibold tracking-tight text-[color:var(--color-foreground)] transition-colors group-hover:text-emerald-300">
                      {notif.title}
                    </h3>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[color:var(--color-muted)]">
                      {notif.message}
                    </p>
                  </div>

                  {/* Footer Action Row */}
                  <div className="mt-3.5 flex items-center justify-between border-t border-[color:var(--color-border)]/50 pt-2.5">
                    {!notif.isRead ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleMarkAsRead(notif.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[color:var(--color-subtle)] transition hover:bg-[color:var(--color-surface-strong)] hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus)]"
                      >
                        <svg
                          className="size-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                        <span>Mark as read</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--color-subtle)]/60">
                        <svg
                          className="size-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                        <span>Read</span>
                      </span>
                    )}

                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
                      <span>View details</span>
                      <span
                        className="transition-transform duration-200 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Load More Button */}
          {hasMore && !isLoading && (
            <div className="pt-2 pb-4 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-4 py-2 text-xs font-semibold text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-strong)] disabled:opacity-50"
              >
                {isLoadingMore ? "Loading..." : "Load earlier notifications"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
