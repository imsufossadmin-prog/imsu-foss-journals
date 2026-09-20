"use client";

import { useEffect, useState } from "react";
import {
  RequestChatBox,
  type ConversationMessageDTO,
} from "@/components/requests/request-components";
import type { RequestActionState } from "@/app/author/requests/actions";

export function ChatDrawer({
  requestId,
  viewerId,
  messages,
  action,
  correctionAction,
  authorCorrectionAction,
  title = "Chat with Editorial Secretariat",
  buttonLabel,
  buttonVariant = "primary",
  defaultOpen = false,
}: {
  requestId: string;
  viewerId: string;
  messages: ConversationMessageDTO[];
  action: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
  correctionAction?: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
  authorCorrectionAction?: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
  title?: string;
  buttonLabel?: string;
  buttonVariant?: "primary" | "secondary" | "pill";
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const userMessagesCount = messages.filter((m) => m.kind === "USER").length;
  const displayLabel =
    buttonLabel ??
    `💬 ${title}${userMessagesCount > 0 ? ` (${userMessagesCount})` : ""}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          buttonVariant === "pill"
            ? "inline-flex items-center gap-2 rounded-full border border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent-soft)] px-3.5 py-1.5 text-xs font-semibold text-[color:var(--color-accent)] shadow-xs transition hover:bg-[color:var(--color-accent)] hover:text-white"
            : buttonVariant === "primary"
              ? "button-primary inline-flex items-center gap-2 text-xs"
              : "button-secondary inline-flex items-center gap-2 text-xs"
        }
      >
        <span>💬</span>
        <span>{displayLabel}</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="animate-in fade-in fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over drawer */}
          <div
            className="animate-in slide-in-from-right relative z-10 flex h-full w-full max-w-lg flex-col border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl transition-transform sm:max-w-xl"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  <h2 className="truncate font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                    {title}
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-[color:var(--color-muted)]">
                  Live conversation & editorial messaging
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex size-8 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-sm font-semibold text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-surface-strong)] hover:text-[color:var(--color-foreground)]"
                title="Close chat drawer"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Drawer Chat Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-3 sm:p-4">
                <RequestChatBox
                  requestId={requestId}
                  viewerId={viewerId}
                  messages={messages}
                  action={action}
                  correctionAction={correctionAction}
                  authorCorrectionAction={authorCorrectionAction}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
