"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";

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
};

const time = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function ConversationThread({
  requestId,
  viewerId,
  messages,
}: {
  requestId: string;
  viewerId: string;
  messages: ConversationMessageDTO[];
}) {
  return (
    <ol className="space-y-4 py-2" aria-label="Submission conversation">
      {messages.map((message) => {
        if (message.kind === "SYSTEM") {
          return (
            <li
              key={message.id}
              className="my-3 flex items-center justify-center text-center"
            >
              <span className="rounded-full bg-[color:var(--color-surface-strong)] px-3 py-1 text-[11px] font-medium text-[color:var(--color-subtle)]">
                {message.body}
              </span>
            </li>
          );
        }
        const mine = message.sender?.id === viewerId;
        return (
          <li
            key={message.id}
            className={`flex w-full min-w-0 flex-col ${mine ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[88%] min-w-0 rounded-[var(--radius-lg)] px-3.5 py-2.5 break-words shadow-sm sm:max-w-[80%] sm:px-4 sm:py-3 ${
                mine
                  ? "rounded-br-xs bg-[color:var(--color-accent)] text-[#04120e]"
                  : "rounded-bl-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-foreground)]"
              }`}
            >
              <p
                className={`text-[10px] font-bold tracking-wide uppercase ${
                  mine
                    ? "text-[#04120e]/70"
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
                  className={`mt-2 flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold transition ${
                    mine
                      ? "bg-[#04120e]/15 text-[#04120e] hover:bg-[#04120e]/25"
                      : "bg-[color:var(--color-surface-strong)] text-[color:var(--color-accent)] hover:underline"
                  }`}
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
            <p className="mt-1 px-1 text-[10px] text-[color:var(--color-subtle)]">
              {time.format(new Date(message.createdAt))}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function MessageComposer({
  action,
  requestId,
  receipt = false,
}: {
  action: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
  requestId?: string;
  receipt?: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim() || pending) return;

    setError("");
    const messageText = text;
    setText("");

    const formData = new FormData();
    formData.set("body", messageText);

    startTransition(async () => {
      const res = await action({}, formData);
      if (res?.error) {
        setError(res.error);
        setText(messageText);
      } else {
        router.refresh();
      }
    });
  };

  const handleFileUpload = (file: File) => {
    if (!requestId) return;
    setUploadStatus("Uploading file...");
    const body = new FormData();
    body.set("file", file);
    body.set("attachmentType", receipt ? "PAYMENT_RECEIPT" : "GENERAL");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/requests/${requestId}/attachments`);
    xhr.addEventListener("load", () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        setUploadStatus("Upload failed.");
      } else {
        setUploadStatus("File attached!");
        startTransition(() => router.refresh());
      }
    });
    xhr.addEventListener("error", () => setUploadStatus("Network error."));
    xhr.send(body);
  };

  return (
    <div className="border-t border-[color:var(--color-border)] pt-4">
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

      {uploadStatus ? (
        <p className="mb-2 text-xs font-semibold text-[color:var(--color-accent)]">
          {uploadStatus}
        </p>
      ) : null}

      <form onSubmit={handleSend} className="flex items-center gap-2">
        {requestId ? (
          <button
            type="button"
            title="Attach receipt or file"
            onClick={() => fileInputRef.current?.click()}
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-strong)] focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus)]"
          >
            <svg
              className="size-5 text-[color:var(--color-accent)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        ) : null}

        <input
          type="text"
          name="body"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="app-field flex-1"
          required
        />

        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="button-primary size-10 shrink-0 rounded-[var(--radius-md)] !p-0"
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
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    setStatus("Uploading file...");
    const body = new FormData();
    body.set("file", file);
    body.set("attachmentType", receipt ? "PAYMENT_RECEIPT" : "GENERAL");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/requests/${requestId}/attachments`);
    xhr.addEventListener("load", () => {
      if (xhr.status < 200 || xhr.status >= 300) setStatus("Upload failed.");
      else {
        setStatus(receipt ? "Receipt uploaded." : "File uploaded.");
        startTransition(() => router.refresh());
      }
    });
    xhr.addEventListener("error", () => setStatus("Network error."));
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
        className="button-secondary text-xs"
        disabled={pending}
        onClick={() => input.current?.click()}
      >
        Choose file
      </button>
      {status ? (
        <p className="text-xs text-[color:var(--color-accent)]">{status}</p>
      ) : null}
    </div>
  );
}

type SimpleAuthor = {
  fullName: string;
  email: string;
  affiliation: string;
  orcid: string;
  isCorrespondingAuthor: boolean;
};

export function SimpleArticleDetailsForm({
  action,
  version,
  initial,
}: {
  action: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
  version: number;
  initial: {
    title: string;
    abstract: string;
    keywords: string;
    authors: SimpleAuthor[];
  };
}) {
  const [authors, setAuthors] = useState<SimpleAuthor[]>(
    initial.authors.length
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
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-7">
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="authors" value={JSON.stringify(authors)} />
      <Field label="Article title" error={state.fieldErrors?.title}>
        <input
          className="app-field"
          name="title"
          defaultValue={initial.title}
          required
        />
      </Field>
      <div>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold">Author(s)</h2>
          <button
            type="button"
            className="text-xs font-semibold text-[color:var(--color-accent)]"
            onClick={() =>
              setAuthors([
                ...authors.map((author) => ({
                  ...author,
                  isCorrespondingAuthor: false,
                })),
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
            Add author
          </button>
        </div>
        <div className="mt-3 space-y-4">
          {authors.map((author, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border)] p-4 sm:grid-cols-2"
            >
              <input
                className="app-field"
                aria-label={`Author ${index + 1} full name`}
                placeholder="Full name"
                value={author.fullName}
                onChange={(event) =>
                  setAuthors(
                    authors.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, fullName: event.target.value }
                        : item,
                    ),
                  )
                }
                required
              />
              <input
                className="app-field"
                aria-label={`Author ${index + 1} email`}
                type="email"
                placeholder="Email"
                value={author.email}
                onChange={(event) =>
                  setAuthors(
                    authors.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, email: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <input
                className="app-field sm:col-span-2"
                aria-label={`Author ${index + 1} affiliation`}
                placeholder="Affiliation (optional)"
                value={author.affiliation}
                onChange={(event) =>
                  setAuthors(
                    authors.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, affiliation: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="corresponding"
                  checked={author.isCorrespondingAuthor}
                  onChange={() =>
                    setAuthors(
                      authors.map((item, itemIndex) => ({
                        ...item,
                        isCorrespondingAuthor: itemIndex === index,
                      })),
                    )
                  }
                />{" "}
                Corresponding author
              </label>
              {authors.length > 1 ? (
                <button
                  type="button"
                  className="justify-self-start text-xs font-semibold text-[color:var(--color-danger)] sm:justify-self-end"
                  onClick={() => {
                    const next = authors.filter(
                      (_, itemIndex) => itemIndex !== index,
                    );
                    if (!next.some((item) => item.isCorrespondingAuthor))
                      next[0] = { ...next[0], isCorrespondingAuthor: true };
                    setAuthors(next);
                  }}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {state.fieldErrors?.authors || state.fieldErrors?.corresponding ? (
          <p className="mt-2 text-xs text-[color:var(--color-danger)]">
            {state.fieldErrors.authors ?? state.fieldErrors.corresponding}
          </p>
        ) : null}
      </div>
      <Field label="Abstract" error={state.fieldErrors?.abstract}>
        <textarea
          className="app-field min-h-36"
          name="abstract"
          defaultValue={initial.abstract}
          required
        />
      </Field>
      <Field label="Keywords">
        <input
          className="app-field"
          name="keywords"
          defaultValue={initial.keywords}
          placeholder="e.g. psychology, wellbeing, students"
        />
      </Field>
      <div className="flex items-center justify-between gap-3 border-t border-[color:var(--color-border)] pt-5">
        <p
          className="text-xs text-[color:var(--color-accent)]"
          aria-live="polite"
        >
          {state.error ?? state.message}
        </p>
        <PendingButton className="button-secondary" pendingLabel="Saving…">
          Save article details
        </PendingButton>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <div className="mt-2">{children}</div>
      {error ? (
        <span className="mt-2 block text-xs text-[color:var(--color-danger)]">
          {error}
        </span>
      ) : null}
    </label>
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
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  function upload(file: File) {
    const body = new FormData();
    body.set("file", file);
    body.set("type", "MANUSCRIPT");
    body.set("version", String(version));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/author/submissions/${submissionId}/files`);
    xhr.upload.addEventListener(
      "progress",
      (event) =>
        event.lengthComputable &&
        setProgress(Math.round((event.loaded / event.total) * 100)),
    );
    xhr.addEventListener("load", () => {
      let response: { error?: string } = {};
      try {
        response = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status < 200 || xhr.status >= 300)
        return setStatus(response.error ?? "Upload failed.");
      setStatus("Manuscript uploaded.");
      router.refresh();
    });
    xhr.addEventListener("error", () =>
      setStatus("The network interrupted the upload. Try again."),
    );
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
            {fileName ?? "PDF or DOCX · up to 20 MB"}
          </p>
        </div>
        <button
          type="button"
          className="button-secondary"
          onClick={() => input.current?.click()}
        >
          {fileName
            ? "Replace file"
            : progress > 0 && progress < 100
              ? `Uploading ${progress}%`
              : "Choose file"}
        </button>
      </div>
      {status ? (
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

export function AdminStateAction({
  action,
  label,
  field,
}: {
  action: (
    state: RequestActionState,
    formData: FormData,
  ) => Promise<RequestActionState>;
  label: string;
  field?: "trackingId";
}) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-3">
      {field ? (
        <label className="block text-xs font-semibold">
          Tracking ID
          <input
            className="app-field mt-2 font-mono uppercase"
            name="trackingId"
            placeholder="PSY-2026-001"
            required
          />
        </label>
      ) : null}
      <PendingButton className="button-primary" pendingLabel="Saving…">
        {label}
      </PendingButton>
      {state.error || state.message ? (
        <p
          className={`text-xs ${state.error ? "text-[color:var(--color-danger)]" : "text-[color:var(--color-accent)]"}`}
          role={state.error ? "alert" : "status"}
        >
          {state.error ?? state.message}
        </p>
      ) : null}
    </form>
  );
}
