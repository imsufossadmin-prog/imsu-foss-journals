"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import type { RequestActionState } from "@/app/author/requests/actions";
import { PendingButton } from "@/components/submissions/pending-button";
import { requestStatusContent } from "@/lib/requests/validation";

const initialState: RequestActionState = {};

export function RequestStatus({
  status,
  guidance = false,
}: {
  status: keyof typeof requestStatusContent;
  guidance?: boolean;
}) {
  const content = requestStatusContent[status];
  return (
    <div>
      <span className="inline-flex rounded-full bg-[color:var(--color-accent-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--color-accent)]">
        {content.label}
      </span>
      {guidance ? (
        <p className="mt-3 text-sm leading-6 text-[color:var(--color-muted)]">
          {content.authorGuidance}
        </p>
      ) : null}
    </div>
  );
}

export type ConversationMessageDTO = {
  id: string;
  kind: "USER" | "SYSTEM";
  body: string | null;
  createdAt: string;
  sender: { id: string; displayName: string } | null;
  attachments: Array<{
    id: string;
    type: "GENERAL" | "PAYMENT_RECEIPT";
    originalFileName: string;
    sizeBytes: number;
  }>;
  status?: "sending" | "sent" | "delivered";
};

const time = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function SendingSpinner() {
  return (
    <svg
      className="size-3 animate-spin text-current opacity-80"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function SingleTick() {
  return (
    <svg
      className="size-3.5 text-current opacity-70"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DoubleTick() {
  return (
    <svg
      className="size-3.5 text-emerald-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L7 17l-5-5" />
      <path d="M22 6l-11 11-2-2" />
    </svg>
  );
}

function StatusIndicator({
  status = "delivered",
}: {
  status?: "sending" | "sent" | "delivered";
}) {
  if (status === "sending") return <SendingSpinner />;
  if (status === "sent") return <SingleTick />;
  return <DoubleTick />;
}

export function ConversationThread({
  requestId,
  viewerId,
  messages,
  optimisticMessages = [],
}: {
  requestId: string;
  viewerId: string;
  messages: ConversationMessageDTO[];
  optimisticMessages?: ConversationMessageDTO[];
}) {
  const combinedMessages = [...messages, ...optimisticMessages];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [combinedMessages.length]);

  return (
    <div
      ref={scrollRef}
      className="max-h-[380px] min-h-[160px] w-full max-w-full min-w-0 space-y-4 overflow-x-hidden overflow-y-auto scroll-smooth pr-1 text-sm"
    >
      <ol className="space-y-4 py-2" aria-label="Submission conversation">
        {combinedMessages.map((message) => {
          if (message.kind === "SYSTEM") {
            const hasArticleLink = message.body?.includes("/articles/");
            const parts = message.body?.split(" View article live: ");
            const mainText = parts?.[0] ?? message.body;
            const articleUrl = parts?.[1];

            return (
              <li
                key={message.id}
                className="my-3 flex w-full flex-col items-center justify-center text-center"
              >
                <div className="max-w-[92%] min-w-0 rounded-[var(--radius-lg)] border border-[color:var(--color-accent)]/30 bg-[#0c231e] px-4 py-2.5 text-xs leading-relaxed font-medium text-[color:var(--color-foreground)] shadow-sm">
                  <p>{mainText}</p>
                  {hasArticleLink && articleUrl ? (
                    <div className="mt-2 border-t border-[color:var(--color-border)] pt-1">
                      <Link
                        href={articleUrl}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
                      >
                        View Published Article Live →
                      </Link>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          }
          const mine = message.sender?.id === viewerId;
          const status = message.status ?? "delivered";

          return (
            <li
              key={message.id}
              className={`flex w-full min-w-0 flex-col ${mine ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[88%] min-w-0 rounded-[var(--radius-lg)] px-3.5 py-2.5 break-words shadow-sm sm:max-w-[80%] sm:px-4 sm:py-3 ${
                  mine
                    ? "rounded-br-xs border border-[color:var(--color-accent)]/40 bg-[#0d2822] text-[color:var(--color-foreground)]"
                    : "rounded-bl-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-foreground)]"
                }`}
              >
                <p
                  className={`text-[10px] font-bold tracking-wide uppercase ${
                    mine
                      ? "text-[color:var(--color-accent)]"
                      : "text-[color:var(--color-subtle)]"
                  }`}
                >
                  {mine ? "You" : (message.sender?.displayName ?? "Journal")}
                </p>
                {message.body ? (
                  <p className="mt-1 font-sans text-xs leading-relaxed font-medium break-words whitespace-pre-wrap sm:text-sm">
                    {message.body}
                  </p>
                ) : null}
                {message.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={`/api/requests/${requestId}/attachments/${attachment.id}`}
                    className="mt-2 flex max-w-full min-w-0 items-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--color-surface-strong)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--color-accent)] transition hover:underline"
                  >
                    <svg
                      className="size-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                    <span className="truncate">
                      {attachment.type === "PAYMENT_RECEIPT"
                        ? "Receipt: "
                        : "File: "}
                      {attachment.originalFileName}
                    </span>
                  </a>
                ))}
              </div>
              <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-[color:var(--color-subtle)]">
                <span>{time.format(new Date(message.createdAt))}</span>
                {mine ? <StatusIndicator status={status} /> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function MessageComposer({
  action,
  requestId,
  viewerId = "",
  receipt = false,
  onOptimisticAdd,
  onOptimisticUpdate,
}: {
  action: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
  requestId?: string;
  viewerId?: string;
  receipt?: boolean;
  onOptimisticAdd?: (msg: ConversationMessageDTO) => void;
  onOptimisticUpdate?: (
    id: string,
    update: Partial<ConversationMessageDTO>,
  ) => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentType, setAttachmentType] = useState<
    "GENERAL" | "PAYMENT_RECEIPT"
  >(receipt ? "PAYMENT_RECEIPT" : "GENERAL");
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const triggerUpload = (type: "GENERAL" | "PAYMENT_RECEIPT") => {
    setAttachmentType(type);
    setShowAttachMenu(false);
    fileInputRef.current?.click();
  };

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim() || pending) return;

    setError("");
    const messageText = text.trim();
    setText("");

    const tempId = `temp-${Date.now()}`;
    const tempMsg: ConversationMessageDTO = {
      id: tempId,
      kind: "USER",
      body: messageText,
      createdAt: new Date().toISOString(),
      sender: { id: viewerId, displayName: "You" },
      attachments: [],
      status: "sending",
    };
    onOptimisticAdd?.(tempMsg);

    const formData = new FormData();
    formData.set("body", messageText);

    startTransition(async () => {
      const res = await action({}, formData);
      if (res?.error) {
        setError(res.error);
        setText(messageText);
        onOptimisticUpdate?.(tempId, { status: "sending" });
      } else {
        onOptimisticUpdate?.(tempId, { status: "delivered" });
      }
    });
  };

  const handleFileUpload = (file: File) => {
    if (!requestId) return;

    const tempId = `temp-file-${Date.now()}`;
    const tempFileMsg: ConversationMessageDTO = {
      id: tempId,
      kind: "USER",
      body: null,
      createdAt: new Date().toISOString(),
      sender: { id: viewerId, displayName: "You" },
      attachments: [
        {
          id: `temp-att-${Date.now()}`,
          type: attachmentType,
          originalFileName: file.name,
          sizeBytes: file.size,
        },
      ],
      status: "sending",
    };
    onOptimisticAdd?.(tempFileMsg);

    const body = new FormData();
    body.set("file", file);
    body.set("attachmentType", attachmentType);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/requests/${requestId}/attachments`);
    xhr.addEventListener("load", () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          setError(json.error || "File upload failed.");
        } catch {
          setError("File upload failed.");
        }
      } else {
        onOptimisticUpdate?.(tempId, { status: "delivered" });
        startTransition(() => router.refresh());
      }
    });
    xhr.addEventListener("error", () => setError("Network upload error."));
    xhr.send(body);
  };

  return (
    <div className="relative border-t border-[color:var(--color-border)] pt-4">
      {requestId ? (
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.currentTarget.value = "";
          }}
        />
      ) : null}

      {/* Attach Popover Menu */}
      {showAttachMenu ? (
        <div className="absolute bottom-16 left-0 z-50 w-64 rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-2 shadow-[var(--shadow-menu)]">
          <p className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-[color:var(--color-subtle)] uppercase">
            Add attachment
          </p>
          <button
            type="button"
            onClick={() => triggerUpload("PAYMENT_RECEIPT")}
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left text-xs font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-strong)]"
          >
            <span>💳</span>
            <span>Upload Payment Receipt</span>
          </button>
          <button
            type="button"
            onClick={() => triggerUpload("GENERAL")}
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left text-xs font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-strong)]"
          >
            <span>📄</span>
            <span>Upload Document / Manuscript</span>
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSend} className="flex w-full items-center gap-2">
        {requestId ? (
          <button
            type="button"
            title="Add attachment"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-lg font-semibold text-[color:var(--color-accent)] transition hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)] focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus)]"
          >
            +
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <input
            type="text"
            name="body"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="app-field !w-full"
            required
          />
        </div>

        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="button-primary flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] !p-0"
          title="Send message"
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </form>

      {error ? (
        <p
          className="mt-2 text-xs text-[color:var(--color-danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AttachmentUploader({
  requestId,
  receipt = false,
}: {
  requestId: string;
  receipt?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    const body = new FormData();
    body.set("file", file);
    body.set("attachmentType", receipt ? "PAYMENT_RECEIPT" : "GENERAL");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/requests/${requestId}/attachments`);
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        startTransition(() => router.refresh());
      }
    });
    xhr.send(body);
  }

  return (
    <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
      <input
        ref={input}
        type="file"
        className="sr-only"
        accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.currentTarget.value = "";
        }}
      />
      <div>
        <p className="text-xs font-semibold text-[color:var(--color-foreground)]">
          {receipt ? "Upload payment receipt" : "Upload document"}
        </p>
        <p className="text-[11px] text-[color:var(--color-subtle)]">
          PDF, DOCX, JPG or PNG (up to 20 MB)
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => input.current?.click()}
        className="button-secondary text-xs"
      >
        Choose file
      </button>
    </div>
  );
}

export function RequestChatBox({
  requestId,
  viewerId,
  messages,
  action,
}: {
  requestId: string;
  viewerId: string;
  messages: ConversationMessageDTO[];
  action: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
}) {
  const router = useRouter();
  const [optimisticMessages, setOptimisticMessages] = useState<
    ConversationMessageDTO[]
  >([]);
  const [prevMessages, setPrevMessages] = useState(messages);

  if (messages !== prevMessages) {
    setPrevMessages(messages);
    setOptimisticMessages([]);
  }

  const [, startTransition] = useTransition();
  const isPollingRef = useRef(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const poll = () => {
      if (
        typeof document === "undefined" ||
        document.visibilityState !== "visible"
      )
        return;
      if (isPollingRef.current) return;

      isPollingRef.current = true;
      startTransition(() => {
        router.refresh();
        isPollingRef.current = false;
      });
    };

    const scheduleNext = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        poll();
        scheduleNext();
      }, 4000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        poll();
        scheduleNext();
      } else if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    scheduleNext();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  const handleOptimisticUpdate = (
    id: string,
    update: Partial<ConversationMessageDTO>,
  ) => {
    setOptimisticMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...update } : msg)),
    );
  };

  return (
    <div>
      <ConversationThread
        requestId={requestId}
        viewerId={viewerId}
        messages={messages}
        optimisticMessages={optimisticMessages}
      />
      <div className="mt-4">
        <MessageComposer
          requestId={requestId}
          viewerId={viewerId}
          action={action}
          onOptimisticAdd={(msg) =>
            setOptimisticMessages((prev) => [...prev, msg])
          }
          onOptimisticUpdate={handleOptimisticUpdate}
        />
      </div>
    </div>
  );
}

export function AdminStateAction({
  action,
  label,
  variant = "secondary",
}: {
  action: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
  label: string;
  variant?: "primary" | "secondary";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(initialState, formData);
      if (res?.error) {
        setError(res.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="submit"
        disabled={isPending}
        className={
          variant === "primary"
            ? "button-primary w-full"
            : "button-secondary w-full"
        }
      >
        {isPending ? "Processing…" : label}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-[color:var(--color-danger)]">{error}</p>
      ) : null}
    </form>
  );
}

export function TrackingIdForm({
  action,
  currentTrackingId,
  isEditing = false,
}: {
  action: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
  currentTrackingId?: string | null;
  isEditing?: boolean;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label
          htmlFor="trackingId"
          className="block text-xs font-semibold text-[color:var(--color-muted)]"
        >
          {isEditing ? "Custom Tracking ID" : "Assign Tracking ID"}
        </label>
        <input
          key={currentTrackingId ?? "empty"}
          id="trackingId"
          name="trackingId"
          type="text"
          defaultValue={currentTrackingId ?? ""}
          placeholder="e.g. IMSU-AJSBS-2026-001"
          className="mt-1 block w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 font-mono text-xs text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-accent)] focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-[color:var(--color-muted)]">
          {isEditing
            ? "Changing this will update the tracking ID for the author and internal records."
            : "Leave empty to auto-generate, or enter a custom identifier."}
        </p>
      </div>

      <PendingButton
        className="button-primary w-full"
        pendingLabel={isEditing ? "Updating…" : "Assigning…"}
      >
        {isEditing ? "Update Tracking ID" : "Assign Tracking ID"}
      </PendingButton>

      {state.error ? (
        <p className="text-xs text-[color:var(--color-danger)]">
          {state.error}
        </p>
      ) : null}
      {state.message && !state.error ? (
        <p className="text-xs text-[color:var(--color-accent)]">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function InlineEditableTrackingId({
  action,
  trackingId,
}: {
  action: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
  trackingId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(initialState, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setIsEditing(false);
      }
    });
  };

  if (!isEditing) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <p className="font-mono text-xs font-semibold text-[color:var(--color-accent)] sm:text-sm">
          Tracking ID: {trackingId}
        </p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsEditing(true);
          }}
          className="inline-flex items-center justify-center rounded p-1 text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-foreground)]"
          title="Edit tracking ID"
          aria-label="Edit tracking ID"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 max-w-md rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-2.5">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            id="trackingId"
            name="trackingId"
            type="text"
            defaultValue={trackingId}
            placeholder="e.g. IMSU-2026-002"
            autoFocus
            disabled={isPending}
            className="block flex-1 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-2.5 py-1 font-mono text-xs text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-accent)] focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPending}
            className="button-primary px-2.5 py-1 text-xs"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setIsEditing(false)}
            className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] px-2.5 py-1 text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {error ? (
          <p className="text-[11px] text-[color:var(--color-danger)]">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}

export function StartSubmissionForm({
  action,
  journals,
}: {
  action: (formData?: FormData) => Promise<void>;
  journals: Array<{ id: string; name: string; department: { name: string } }>;
}) {
  const [journalId, setJournalId] = useState(journals[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  void pending;

  return (
    <form
      action={(formData) => {
        if (journalId) formData.set("journalId", journalId);
        startTransition(() => action(formData));
      }}
      className="flex items-center gap-2"
    >
      {journals.length > 1 ? (
        <select
          name="journalId"
          value={journalId}
          onChange={(e) => setJournalId(e.target.value)}
          className="app-field text-xs"
        >
          {journals.map((j) => (
            <option key={j.id} value={j.id}>
              {j.department.name}
            </option>
          ))}
        </select>
      ) : (
        <input type="hidden" name="journalId" value={journalId} />
      )}
      <PendingButton className="button-primary shrink-0 text-xs">
        Start request
      </PendingButton>
    </form>
  );
}

export function ManuscriptUpload({
  submissionId,
  version,
  fileName,
}: {
  submissionId: string;
  version: number;
  fileName?: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [prevFileName, setPrevFileName] = useState(fileName);
  const [currentFileName, setCurrentFileName] = useState(fileName);
  if (fileName !== prevFileName) {
    setPrevFileName(fileName);
    setCurrentFileName(fileName);
  }

  const [prevVersion, setPrevVersion] = useState(version);
  const [currentVersion, setCurrentVersion] = useState(version);
  if (version !== prevVersion) {
    setPrevVersion(version);
    setCurrentVersion(version);
  }
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  function upload(file: File) {
    setUploading(true);
    setProgress(10);
    setStatus("Uploading manuscript file…");

    const body = new FormData();
    body.set("file", file);
    body.set("type", "MANUSCRIPT");
    body.set("version", String(currentVersion));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/author/submissions/${submissionId}/files`);
    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      setProgress(Math.round((event.loaded / event.total) * 100));
    });

    xhr.addEventListener("load", () => {
      setProgress(100);
      let response: { error?: string; fileName?: string; version?: number } =
        {};
      try {
        response = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status < 200 || xhr.status >= 300) {
        setUploading(false);
        return setStatus(response.error ?? "Upload failed.");
      }
      if (response.fileName) setCurrentFileName(response.fileName);
      if (response.version) setCurrentVersion(response.version);
      setStatus("Manuscript uploaded successfully.");
      setTimeout(() => {
        setUploading(false);
        router.refresh();
      }, 400);
    });

    xhr.addEventListener("error", () => {
      setUploading(false);
      setStatus("The network interrupted the upload. Try again.");
    });
    xhr.send(body);
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] p-5">
      <input
        ref={input}
        type="file"
        className="sr-only"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
          event.currentTarget.value = "";
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Manuscript</h2>
          <p className="mt-1 text-xs text-[color:var(--color-subtle)]">
            {currentFileName ?? "PDF or DOCX · up to 20 MB"}
          </p>
        </div>
        <button
          type="button"
          className="button-secondary flex items-center gap-2"
          disabled={uploading}
          onClick={() => input.current?.click()}
        >
          {uploading ? (
            <>
              <svg
                className="size-3.5 animate-spin text-[color:var(--color-accent)]"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Uploading {progress}%…</span>
            </>
          ) : currentFileName ? (
            "Replace file"
          ) : (
            "Choose file"
          )}
        </button>
      </div>
      {uploading ? (
        <div className="rounded.sm mt-3 flex items-center gap-2 bg-[color:var(--color-surface-strong)] px-3 py-2 text-xs font-semibold text-[color:var(--color-accent)]">
          <svg
            className="size-4 shrink-0 animate-spin text-[color:var(--color-accent)]"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Uploading manuscript file ({progress}%)… Please wait.</span>
        </div>
      ) : status ? (
        <p className="mt-3 text-xs" aria-live="polite">
          {status}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitArticleForm({
  action,
  disabled,
}: {
  action: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
  disabled: boolean;
}) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-col items-start gap-3">
      <PendingButton
        className="button-primary"
        pendingLabel="Submitting…"
        disabled={disabled}
      >
        Submit article
      </PendingButton>
      {state.error ? (
        <p className="text-xs text-[color:var(--color-danger)]" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function SimpleArticleDetailsForm({
  action,
  version,
  initial,
}: {
  action: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
  version?: number;
  initial: {
    title: string;
    abstract: string;
    keywords: string;
    authors: Array<{
      fullName: string;
      email: string;
      affiliation?: string;
      orcid?: string;
      isCorrespondingAuthor: boolean;
    }>;
  };
}) {
  void version;
  const [title, setTitle] = useState(initial.title);
  const [abstract, setAbstract] = useState(initial.abstract);
  const [keywords, setKeywords] = useState(initial.keywords);
  const [state, formAction] = useActionState(action, initialState);
  const [authors, setAuthors] = useState(
    initial.authors.length > 0
      ? initial.authors
      : [
          {
            fullName: "",
            email: "",
            affiliation: "",
            orcid: "",
            isCorrespondingAuthor: true,
          },
        ],
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="authors" value={JSON.stringify(authors)} />
      <label className="block text-sm font-semibold">
        Article Title
        <input
          className="app-field mt-2"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Authors & Correspondents</p>
          <button
            type="button"
            className="text-xs text-[color:var(--color-accent)] hover:underline"
            onClick={() =>
              setAuthors([
                ...authors,
                {
                  fullName: "",
                  email: "",
                  affiliation: "",
                  orcid: "",
                  isCorrespondingAuthor: false,
                },
              ])
            }
          >
            + Add another author
          </button>
        </div>
        {authors.map((author, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border)] p-3 sm:grid-cols-[1fr_1.2fr_auto_auto] sm:items-center"
          >
            <input
              className="app-field text-xs"
              name={`author_fullname_${index}`}
              placeholder="Full name"
              value={author.fullName}
              onChange={(e) =>
                setAuthors(
                  authors.map((a, i) =>
                    i === index ? { ...a, fullName: e.target.value } : a,
                  ),
                )
              }
              required
            />
            <input
              className="app-field text-xs"
              name={`author_email_${index}`}
              placeholder="Email address"
              value={author.email}
              onChange={(e) =>
                setAuthors(
                  authors.map((a, i) =>
                    i === index ? { ...a, email: e.target.value } : a,
                  ),
                )
              }
              type="email"
              required
            />
            <label className="flex items-center gap-1.5 text-xs text-[color:var(--color-subtle)]">
              <input
                type="checkbox"
                name={`author_correspondent_${index}`}
                checked={author.isCorrespondingAuthor}
                onChange={(e) =>
                  setAuthors(
                    authors.map((a, i) => ({
                      ...a,
                      isCorrespondingAuthor:
                        i === index
                          ? e.target.checked
                          : a.isCorrespondingAuthor,
                    })),
                  )
                }
              />
              Correspondent
            </label>
            {authors.length > 1 ? (
              <button
                type="button"
                title="Remove author"
                onClick={() =>
                  setAuthors(authors.filter((_, i) => i !== index))
                }
                className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] text-xs font-bold text-[color:var(--color-danger)] transition hover:border-[color:var(--color-danger)] hover:bg-[color:var(--color-danger)]/10"
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <label className="block text-sm font-semibold">
        Abstract
        <textarea
          className="app-field mt-2 min-h-36"
          name="abstract"
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm font-semibold">
        Keywords
        <input
          className="app-field mt-2"
          name="keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="e.g. psychology, wellbeing, students"
        />
      </label>
      {state.error ? (
        <p className="text-xs text-[color:var(--color-danger)]">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function CanonicalArticleSubmissionForm({
  action,
  submissionId,
  version = 1,
  initial,
  fileName: initialFileName,
}: {
  action: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
  submissionId: string;
  version?: number;
  initial: {
    title: string;
    abstract: string;
    keywords: string;
    authors: Array<{
      fullName: string;
      email: string;
      affiliation?: string;
      orcid?: string;
      isCorrespondingAuthor: boolean;
    }>;
  };
  fileName?: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [abstract, setAbstract] = useState(initial.abstract);
  const [keywords, setKeywords] = useState(initial.keywords);
  const [state, formAction] = useActionState(action, initialState);
  const [authors, setAuthors] = useState(
    initial.authors.length > 0
      ? initial.authors
      : [
          {
            fullName: "",
            email: "",
            affiliation: "",
            orcid: "",
            isCorrespondingAuthor: true,
          },
        ],
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="authors" value={JSON.stringify(authors)} />
      <label className="block text-sm font-semibold">
        Article Title
        <input
          className="app-field mt-2"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Authors & Correspondents</p>
          <button
            type="button"
            className="text-xs text-[color:var(--color-accent)] hover:underline"
            onClick={() =>
              setAuthors([
                ...authors,
                {
                  fullName: "",
                  email: "",
                  affiliation: "",
                  orcid: "",
                  isCorrespondingAuthor: false,
                },
              ])
            }
          >
            + Add another author
          </button>
        </div>
        {authors.map((author, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border)] p-3 sm:grid-cols-[1fr_1.2fr_auto_auto] sm:items-center"
          >
            <input
              className="app-field text-xs"
              name={`author_fullname_${index}`}
              placeholder="Full name"
              value={author.fullName}
              onChange={(e) =>
                setAuthors(
                  authors.map((a, i) =>
                    i === index ? { ...a, fullName: e.target.value } : a,
                  ),
                )
              }
              required
            />
            <input
              className="app-field text-xs"
              name={`author_email_${index}`}
              placeholder="Email address"
              value={author.email}
              onChange={(e) =>
                setAuthors(
                  authors.map((a, i) =>
                    i === index ? { ...a, email: e.target.value } : a,
                  ),
                )
              }
              type="email"
              required
            />
            <label className="flex items-center gap-1.5 text-xs text-[color:var(--color-subtle)]">
              <input
                type="checkbox"
                name={`author_correspondent_${index}`}
                checked={author.isCorrespondingAuthor}
                onChange={(e) =>
                  setAuthors(
                    authors.map((a, i) => ({
                      ...a,
                      isCorrespondingAuthor:
                        i === index
                          ? e.target.checked
                          : a.isCorrespondingAuthor,
                    })),
                  )
                }
              />
              Correspondent
            </label>
            {authors.length > 1 ? (
              <button
                type="button"
                title="Remove author"
                onClick={() =>
                  setAuthors(authors.filter((_, i) => i !== index))
                }
                className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] text-xs font-bold text-[color:var(--color-danger)] transition hover:border-[color:var(--color-danger)] hover:bg-[color:var(--color-danger)]/10"
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <label className="block text-sm font-semibold">
        Abstract
        <textarea
          className="app-field mt-2 min-h-36"
          name="abstract"
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm font-semibold">
        Keywords
        <input
          className="app-field mt-2"
          name="keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="e.g. psychology, wellbeing, students"
        />
      </label>

      <div className="pt-2">
        <ManuscriptUpload
          submissionId={submissionId}
          version={version}
          fileName={initialFileName}
        />
      </div>

      <div className="pt-2">
        <p className="mb-4 text-xs leading-5 text-[color:var(--color-muted)]">
          Submitting sends the manuscript to the journal. Its tracking ID will
          be assigned by the Journal Admin afterward.
        </p>
        <PendingButton
          className="button-primary"
          pendingLabel="Submitting article…"
        >
          Submit article
        </PendingButton>
      </div>

      {state.error ? (
        <p className="text-xs text-[color:var(--color-danger)]">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
