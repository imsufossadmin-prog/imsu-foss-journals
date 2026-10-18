"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getUnreadNotificationCountAction } from "@/app/notifications/actions";
import { NotificationDrawer } from "./notification-drawer";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  const fetchUnreadCount = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      return;
    }

    isFetchingRef.current = true;
    try {
      const res = await getUnreadNotificationCountAction();
      if (typeof res?.count === "number") {
        setUnreadCount(res.count);
      }
    } catch {
      // Suppress unhandled network error
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Initial fetch on mount & conservative refresh on window focus / visibility change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUnreadCount();
    }, 0);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [fetchUnreadCount]);

  const handleUnreadCountChange = useCallback((count: number) => {
    setUnreadCount((prev) => (prev === count ? prev : count));
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const badgeText = unreadCount > 99 ? "99+" : unreadCount.toString();

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="relative grid size-11 cursor-pointer list-none place-items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
      >
        <svg
          aria-hidden="true"
          className="size-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.7"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 font-mono text-[10px] font-bold text-black shadow-sm ring-2 ring-[color:var(--color-surface-raised)]">
            {badgeText}
          </span>
        )}
      </button>

      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onUnreadCountChange={handleUnreadCountChange}
      />
    </>
  );
}
