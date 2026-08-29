"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { InternalChatMessageDTO } from "@/lib/editorial/internal-chat";

const timeFormatter = new Intl.DateTimeFormat("en-NG", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
});

export function InternalChatBox({
  journalSlug,
  viewerId,
  initialMessages = [],
}: {
  journalSlug: string;
  viewerId: string;
  initialMessages: InternalChatMessageDTO[];
}) {
  const [messages, setMessages] =
    useState<InternalChatMessageDTO[]>(initialMessages);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isPollingRef = useRef(false);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Polling architecture adhering to AGENTS.md performance guardrails
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const fetchMessages = async () => {
      if (document.hidden || isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const res = await fetch(`/api/editor/${journalSlug}/internal-chat`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages)) {
            setMessages((prev) => {
              if (
                data.messages.length !== prev.length ||
                data.messages.some(
                  (m: InternalChatMessageDTO, i: number) =>
                    m.id !== prev[i]?.id,
                )
              ) {
                return data.messages;
              }
              return prev;
            });
          }
        }
      } catch {
        // Silently tolerate background network transient errors
      } finally {
        isPollingRef.current = false;
      }
    };

    const schedulePoll = () => {
      if (!document.hidden) {
        timer = setTimeout(async () => {
          await fetchMessages();
          schedulePoll();
        }, 4000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (timer) clearTimeout(timer);
      } else {
        fetchMessages();
        schedulePoll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    schedulePoll();

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [journalSlug]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...selected]);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    setError("");
    const messageText = trimmed;
    const filesToSend = [...attachments];

    // Optimistic UI addition
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: InternalChatMessageDTO = {
      id: tempId,
      body: messageText || (filesToSend.length > 0 ? "Attachment" : null),
      createdAt: new Date().toISOString(),
      sender: {
        id: viewerId,
        displayName: "You",
        roleLabel: "Staff",
      },
      attachments: filesToSend.map((f, i) => ({
        id: `temp-att-${i}`,
        originalFileName: f.name,
        sizeBytes: f.size,
        mimeType: f.type,
      })),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    setAttachments([]);

    startTransition(async () => {
      const formData = new FormData();
      if (messageText) formData.set("body", messageText);
      for (const file of filesToSend) {
        formData.append("files", file);
      }

      if (filesToSend.length > 0) {
        // Native XHR for truthful upload progress reporting
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/editor/${journalSlug}/internal-chat`);
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          setUploadProgress(null);
          if (xhr.status >= 200 && xhr.status < 300) {
            // Trigger sync
            fetch(`/api/editor/${journalSlug}/internal-chat`, {
              cache: "no-store",
            })
              .then((r) => r.json())
              .then((d) => {
                if (d.messages) setMessages(d.messages);
              });
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              setError(res.error || "Failed to send message.");
            } catch {
              setError("Failed to send message.");
            }
            // Revert optimistic
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
          }
        });
        xhr.addEventListener("error", () => {
          setUploadProgress(null);
          setError("Network upload error.");
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        });
        xhr.send(formData);
      } else {
        try {
          const res = await fetch(`/api/editor/${journalSlug}/internal-chat`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "Failed to send message.");
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
          } else {
            // Refresh
            const refreshRes = await fetch(
              `/api/editor/${journalSlug}/internal-chat`,
              { cache: "no-store" },
            );
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData.messages) setMessages(refreshData.messages);
            }
          }
        } catch {
          setError("Network error while sending message.");
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      }
    });
  };

  return (
    <div className="flex h-[620px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)]">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-[color:var(--color-accent)]" />
          <h2 className="text-xs font-semibold tracking-wide text-[color:var(--color-foreground)] uppercase">
            Internal Staff Chat (Editors & Admins Only)
          </h2>
        </div>
        <span className="text-[11px] text-[color:var(--color-subtle)]">
          Private Journal Discussion
        </span>
      </div>

      {/* Messages Thread */}
      <div
        ref={scrollContainerRef}
        className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-[color:var(--color-subtle)]">
            <span className="text-3xl">💬</span>
            <p className="mt-2 text-xs font-medium">
              No messages in this journal staff channel yet.
            </p>
            <p className="mt-0.5 text-[11px]">
              Post general editorial notes, reviewer updates, or coordination
              messages.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.sender?.id === viewerId;
            return (
              <div
                key={message.id}
                className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-[var(--radius-lg)] px-4 py-2.5 text-xs sm:max-w-[75%] ${
                    mine
                      ? "rounded-br-xs border border-[color:var(--color-accent)]/40 bg-[#0d2822] text-[color:var(--color-foreground)]"
                      : "rounded-bl-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)]"
                  }`}
                >
                  <div className="flex items-center gap-2 border-b border-white/5 pb-1 text-[10px]">
                    <span
                      className={`font-bold ${
                        mine
                          ? "text-[color:var(--color-accent)]"
                          : "text-[color:var(--color-foreground)]"
                      }`}
                    >
                      {mine ? "You" : message.sender?.displayName}
                    </span>
                    {message.sender?.roleLabel ? (
                      <span className="py-0.2 rounded bg-black/30 px-1.5 text-[9px] font-semibold text-[color:var(--color-subtle)]">
                        {message.sender.roleLabel}
                      </span>
                    ) : null}
                  </div>

                  {message.body ? (
                    <p className="mt-1.5 leading-relaxed whitespace-pre-wrap">
                      {message.body}
                    </p>
                  ) : null}

                  {message.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={`/api/editor/${journalSlug}/internal-chat/attachments/${att.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 flex items-center gap-2 rounded bg-black/20 px-2.5 py-1.5 text-xs text-[color:var(--color-accent)] hover:underline"
                    >
                      <span>📎</span>
                      <span className="max-w-[200px] truncate">
                        {att.originalFileName}
                      </span>
                      <span className="text-[10px] text-[color:var(--color-subtle)]">
                        ({Math.round(att.sizeBytes / 1024)} KB)
                      </span>
                    </a>
                  ))}
                </div>
                <span className="mt-1 px-1 text-[10px] text-[color:var(--color-subtle)]">
                  {dateFormatter.format(new Date(message.createdAt))} ·{" "}
                  {timeFormatter.format(new Date(message.createdAt))}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Upload progress indicator */}
      {uploadProgress !== null ? (
        <div className="border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-1.5 text-[11px] text-[color:var(--color-accent)]">
          Uploading attachments: {uploadProgress}%
        </div>
      ) : null}

      {/* Attachment chips */}
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-2">
          {attachments.map((file, idx) => (
            <span
              key={`${file.name}-${idx}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-accent)] bg-[color:var(--color-surface-raised)] px-2.5 py-0.5 text-[11px] text-[color:var(--color-foreground)]"
            >
              <span>📎</span>
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(idx)}
                className="text-[color:var(--color-subtle)] hover:text-[color:var(--color-danger)]"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {/* Composer Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 sm:p-4"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
        />

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-subtle)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
            title="Attach file (DOCX, PDF, image)"
          >
            <span className="text-base font-bold">+</span>
          </button>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
            placeholder="Type private message to journal team (Enter to send)..."
            className="app-field max-h-32 min-h-[38px] flex-1 resize-none py-2 text-xs leading-5"
            rows={1}
          />

          <button
            type="submit"
            disabled={pending || (!text.trim() && attachments.length === 0)}
            className="button-primary shrink-0 px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send"}
          </button>
        </div>

        {error ? (
          <p className="mt-2 text-xs text-[color:var(--color-danger)]">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
