"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function RevisionUploadForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/author/submissions/${submissionId}/revisions`,
        {
          method: "POST",
          body: formData,
        },
      );
      const body = (await response.json()) as {
        error?: string;
        versionNumber?: number;
      };
      if (!response.ok)
        throw new Error(body.error ?? "The revision upload failed.");
      setMessage(`Manuscript version ${body.versionNumber} submitted.`);
      formRef.current?.reset();
      router.push(`/author/submissions/${submissionId}`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The revision upload failed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={submit} className="space-y-6">
      <label className="block text-sm font-semibold">
        Revised anonymous manuscript
        <input
          className="app-field mt-2 file:mr-4 file:border-0 file:bg-transparent file:text-xs file:font-semibold"
          type="file"
          name="manuscript"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
        />
        <span className="mt-1 block text-xs font-normal text-[color:var(--color-subtle)]">
          PDF or DOCX, up to 20 MB. Remove names and identity-bearing document
          metadata.
        </span>
      </label>
      <label className="block text-sm font-semibold">
        Response to reviewers{" "}
        <span className="font-normal text-[color:var(--color-subtle)]">
          (optional)
        </span>
        <input
          className="app-field mt-2 file:mr-4 file:border-0 file:bg-transparent file:text-xs file:font-semibold"
          type="file"
          name="response"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />
      </label>
      <label className="block text-sm font-semibold">
        Revision note
        <textarea
          className="app-field mt-2 min-h-32"
          name="authorNote"
          required
          placeholder="Summarize the changes made in this version."
        />
      </label>
      <button className="button-primary" disabled={pending}>
        {pending ? "Uploading revision…" : "Submit revised manuscript"}
      </button>
      <div aria-live="polite" className="min-h-5 text-sm">
        {error ? (
          <p role="alert" className="text-[color:var(--color-danger)]">
            {error}
          </p>
        ) : message ? (
          <p className="text-[color:var(--color-accent)]">{message}</p>
        ) : null}
      </div>
    </form>
  );
}
