"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import {
  assignReviewerAction,
  assignTrackingIdAction,
  beginAssessmentAction,
  cancelReviewerAction,
  correctionAction,
  decisionAction,
  markRevisionReceivedAction,
  passAssessmentAction,
  publishArticleAction,
  skipToPublishingAction,
} from "@/app/admin/[journalSlug]/submissions/actions";
import type { ActionState } from "@/lib/submissions/types";

const initialState: ActionState = {};

function Message({ state }: { state: ActionState }) {
  if (!state.error && !state.message) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={`text-xs ${
        state.error
          ? "text-[color:var(--color-danger)]"
          : "text-[color:var(--color-accent)]"
      }`}
    >
      {state.error ?? state.message}
    </p>
  );
}

function SubmitButton({
  children,
  pendingLabel = "Saving…",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="button-primary" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function RevisionReceivedForm({
  journalSlug,
  submissionId,
}: {
  journalSlug: string;
  submissionId: string;
}) {
  const bound = markRevisionReceivedAction.bind(
    null,
    journalSlug,
    submissionId,
  );
  const [state, action] = useActionState(bound, initialState);
  return (
    <form action={action} className="space-y-3">
      <SubmitButton>Revision received</SubmitButton>
      <Message state={state} />
    </form>
  );
}

export function AssignTrackingIdForm({
  journalSlug,
  submissionId,
}: {
  journalSlug: string;
  submissionId: string;
}) {
  const bound = assignTrackingIdAction.bind(null, journalSlug, submissionId);
  const [state, action] = useActionState(bound, initialState);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label
          htmlFor="trackingId"
          className="block text-xs font-semibold text-[color:var(--color-foreground)]"
        >
          Assign Tracking ID
        </label>
        <p className="mt-1 text-[11px] leading-4 text-[color:var(--color-muted)]">
          Enter custom tracking ID or leave blank to auto-generate.
        </p>
        <input
          id="trackingId"
          name="trackingId"
          type="text"
          placeholder="e.g. IMSUJ-PSY-2026-0001"
          className="app-field mt-2 text-xs"
        />
      </div>
      <SubmitButton>Assign Tracking ID</SubmitButton>
      <Message state={state} />
    </form>
  );
}

export function AssessmentAction({
  journalSlug,
  submissionId,
  kind,
}: {
  journalSlug: string;
  submissionId: string;
  kind: "begin" | "pass";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const serverAction =
    kind === "begin" ? beginAssessmentAction : passAssessmentAction;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await serverAction(journalSlug, submissionId, initialState);
      if (res?.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const label =
    kind === "begin" ? "Start initial assessment" : "Pass initial assessment";
  const pendingLabel =
    kind === "begin" ? "Starting assessment…" : "Passing assessment…";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <button
        type="submit"
        disabled={isPending}
        className="button-primary w-full"
      >
        {isPending ? pendingLabel : label}
      </button>
      {error ? (
        <p className="text-xs text-[color:var(--color-danger)]">{error}</p>
      ) : null}
    </form>
  );
}

export function CorrectionForm({
  journalSlug,
  submissionId,
}: {
  journalSlug: string;
  submissionId: string;
}) {
  const bound = correctionAction.bind(null, journalSlug, submissionId);
  const [state, action] = useActionState(bound, initialState);
  return (
    <form action={action} className="space-y-3">
      <label
        className="block text-xs font-semibold"
        htmlFor="correction-message"
      >
        Return for correction
      </label>
      <textarea
        id="correction-message"
        name="message"
        className="app-field min-h-28"
        placeholder="Describe the exact correction required before peer review."
        required
      />
      {state.fieldErrors?.message ? (
        <p className="text-xs text-[color:var(--color-danger)]">
          {state.fieldErrors.message}
        </p>
      ) : null}
      <SubmitButton>Send correction request</SubmitButton>
      <Message state={state} />
    </form>
  );
}

export function AssignmentForm({
  journalSlug,
  submissionId,
  editors,
}: {
  journalSlug: string;
  submissionId: string;
  editors: Array<{
    id: string;
    displayName: string;
    institution: string | null;
  }>;
}) {
  const bound = assignReviewerAction.bind(null, journalSlug, submissionId);
  const [state, action] = useActionState(bound, initialState);
  return (
    <form
      action={action}
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end"
    >
      <label className="text-xs font-semibold">
        Editor
        <select
          name="editorId"
          className="app-field mt-2"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Choose an editor
          </option>
          {editors.map((editor) => (
            <option key={editor.id} value={editor.id}>
              {editor.displayName}
              {editor.institution ? ` · ${editor.institution}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold">
        Review due
        <input name="dueAt" type="date" className="app-field mt-2" />
      </label>
      <SubmitButton>Assign reviewer</SubmitButton>
      <div className="sm:col-span-3">
        <Message state={state} />
      </div>
    </form>
  );
}

export function CancelAssignmentForm({
  journalSlug,
  submissionId,
  assignmentId,
}: {
  journalSlug: string;
  submissionId: string;
  assignmentId: string;
}) {
  const bound = cancelReviewerAction.bind(null, journalSlug, submissionId);
  const [state, action] = useActionState(bound, initialState);
  return (
    <form action={action} className="text-right">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <button className="text-xs font-semibold text-[color:var(--color-danger)] hover:underline">
        Cancel
      </button>
      <Message state={state} />
    </form>
  );
}

export function DecisionForm({
  journalSlug,
  submissionId,
  roundId,
}: {
  journalSlug: string;
  submissionId: string;
  roundId: string;
}) {
  const bound = decisionAction.bind(null, journalSlug, submissionId, roundId);
  const [state, action] = useActionState(bound, initialState);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold">
          Decision
          <select
            name="type"
            className="app-field mt-2"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Choose a decision
            </option>
            <option value="ACCEPT">Accept</option>
            <option value="MINOR_REVISION">Minor revision</option>
            <option value="MAJOR_REVISION">Major revision</option>
            <option value="REJECT">Reject</option>
          </select>
        </label>
        <label className="text-xs font-semibold">
          Revision due date
          <input name="revisionDueAt" type="date" className="app-field mt-2" />
        </label>
      </div>
      <label className="block text-xs font-semibold">
        Internal rationale
        <textarea name="reason" className="app-field mt-2 min-h-24" />
      </label>
      <label className="block text-xs font-semibold">
        Message to author
        <textarea
          name="authorMessage"
          className="app-field mt-2 min-h-32"
          required
          placeholder="State the decision and the author’s next step."
        />
      </label>
      <SubmitButton>Issue decision</SubmitButton>
      <Message state={state} />
    </form>
  );
}

export function SkipToPublishingForm({
  journalSlug,
  submissionId,
}: {
  journalSlug: string;
  submissionId: string;
}) {
  const bound = skipToPublishingAction.bind(null, journalSlug, submissionId);
  const [state, action] = useActionState(bound, initialState);
  return (
    <form action={action} className="space-y-2">
      <SubmitButton>Proceed to Publishing →</SubmitButton>
      <Message state={state} />
    </form>
  );
}

export function PublishArticleForm({
  journalSlug,
  submissionId,
}: {
  journalSlug: string;
  submissionId: string;
}) {
  const bound = publishArticleAction.bind(null, journalSlug, submissionId);
  const [state, action] = useActionState(bound, initialState);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold">
          Volume Number
          <input
            name="volume"
            type="text"
            className="app-field mt-1.5"
            placeholder="e.g. 1"
          />
        </label>
        <label className="text-xs font-semibold">
          Issue Number
          <input
            name="issue"
            type="text"
            className="app-field mt-1.5"
            placeholder="e.g. 1"
          />
        </label>
        <label className="text-xs font-semibold">
          Page Range
          <input
            name="pageRange"
            type="text"
            className="app-field mt-1.5"
            placeholder="e.g. 15–28"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold">
          Digital Object Identifier - DOI (Optional)
          <input
            name="doi"
            type="text"
            className="app-field mt-1.5 text-xs"
            placeholder="e.g. 10.4314/imsufoss.v1i1.1"
          />
        </label>
        <label className="block text-xs font-semibold">
          Upload Article Cover Image (Optional)
          <input
            name="coverImageFile"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="app-field mt-1.5 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--color-surface-strong)] file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-[color:var(--color-accent)]"
          />
        </label>
      </div>
      <SubmitButton pendingLabel="Publishing article live…">
        Publish Article to Journal
      </SubmitButton>
      <Message state={state} />
    </form>
  );
}
