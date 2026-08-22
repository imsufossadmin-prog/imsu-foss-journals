"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useRef,
  useState,
  useTransition,
  type DragEvent,
} from "react";

import {
  createDraftAction,
  finalizeSubmissionAction,
  removeSubmissionFileAction,
  saveAuthorsAction,
  saveDeclarationsAction,
  saveDetailsAction,
  saveJournalAction,
} from "@/app/author/submissions/actions";
import { PendingButton } from "@/components/submissions/pending-button";
import {
  firstSubmissionFileTypes,
  maxSubmissionFileLabel,
  submissionFileLabels,
  type FirstSubmissionFileType,
} from "@/lib/submissions/constants";
import type {
  ActionState,
  SubmissionAuthorInput,
  SubmissionFileDTO,
} from "@/lib/submissions/types";
import { validateUploadFile } from "@/lib/submissions/validation";

type JournalOption = {
  id: string;
  name: string;
  shortName: string | null;
  description: string | null;
  department: { name: string };
};

const initialActionState: ActionState = {};

function FormMessage({ state }: { state: ActionState }) {
  if (!state.error) return <div className="min-h-5" aria-live="polite" />;
  return (
    <p
      role="alert"
      className="rounded-[var(--radius-md)] border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] px-4 py-3 text-sm leading-6 text-[color:var(--color-danger)]"
    >
      {state.error}
    </p>
  );
}

export function NewSubmissionForm({ journals }: { journals: JournalOption[] }) {
  const [state, action] = useActionState(createDraftAction, initialActionState);
  return (
    <form action={action} className="mt-9">
      <fieldset>
        <legend className="sr-only">Choose a journal</legend>
        <div className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
          {journals.map((journal, index) => (
            <label
              key={journal.id}
              className="group grid cursor-pointer grid-cols-[auto_1fr] gap-4 px-1 py-5 sm:px-3"
            >
              <input
                type="radio"
                name="journalId"
                value={journal.id}
                defaultChecked={index === 0}
                required
                className="mt-1 size-4 accent-[color:var(--color-accent)]"
              />
              <span>
                <span className="block text-sm font-semibold text-[color:var(--color-foreground)]">
                  {journal.name}
                </span>
                <span className="mt-1 block text-xs text-[color:var(--color-subtle)]">
                  {journal.department.name}
                </span>
                {journal.description ? (
                  <span className="mt-2 block max-w-2xl text-sm leading-6 text-[color:var(--color-muted)]">
                    {journal.description}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-6">
        <FormMessage state={state} />
      </div>
      <div className="mt-5 flex justify-end">
        <PendingButton pendingLabel="Creating draft…">
          Begin submission
        </PendingButton>
      </div>
    </form>
  );
}

export function JournalStepForm({
  submissionId,
  version,
  currentJournalId,
  journals,
}: {
  submissionId: string;
  version: number;
  currentJournalId: string;
  journals: JournalOption[];
}) {
  const bound = saveJournalAction.bind(null, submissionId);
  const [state, action] = useActionState(bound, initialActionState);
  return (
    <form action={action}>
      <input type="hidden" name="version" value={version} />
      <div className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
        {journals.map((journal) => (
          <label
            key={journal.id}
            className="grid cursor-pointer grid-cols-[auto_1fr] gap-4 py-5 sm:px-3"
          >
            <input
              type="radio"
              name="journalId"
              value={journal.id}
              defaultChecked={journal.id === currentJournalId}
              className="mt-1 size-4 accent-[color:var(--color-accent)]"
              required
            />
            <span>
              <span className="block text-sm font-semibold">
                {journal.name}
              </span>
              <span className="mt-1 block text-xs text-[color:var(--color-subtle)]">
                {journal.department.name}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-6">
        <FormMessage state={state} />
      </div>
      <StepActions>
        <PendingButton>Save and continue</PendingButton>
      </StepActions>
    </form>
  );
}

export function DetailsStepForm({
  submissionId,
  version,
  title,
  abstract,
  keywords,
}: {
  submissionId: string;
  version: number;
  title: string;
  abstract: string;
  keywords: string[];
}) {
  const bound = saveDetailsAction.bind(null, submissionId);
  const [state, action] = useActionState(bound, initialActionState);
  return (
    <form action={action} className="max-w-3xl space-y-6">
      <input type="hidden" name="version" value={version} />
      <Field
        label="Manuscript title"
        htmlFor="title"
        error={state.fieldErrors?.title}
      >
        <input
          className="app-field"
          id="title"
          name="title"
          defaultValue={title}
          maxLength={300}
          required
          aria-invalid={Boolean(state.fieldErrors?.title)}
          aria-describedby={
            state.fieldErrors?.title ? "title-error" : undefined
          }
        />
      </Field>
      <Field
        label="Abstract"
        htmlFor="abstract"
        error={state.fieldErrors?.abstract}
      >
        <textarea
          className="app-field min-h-48 resize-y leading-6"
          id="abstract"
          name="abstract"
          defaultValue={abstract}
          maxLength={10_000}
          required
          aria-invalid={Boolean(state.fieldErrors?.abstract)}
          aria-describedby={
            state.fieldErrors?.abstract ? "abstract-error" : "abstract-help"
          }
        />
        <p
          id="abstract-help"
          className="mt-2 text-xs text-[color:var(--color-subtle)]"
        >
          Use the abstract that should accompany this manuscript during
          editorial consideration.
        </p>
      </Field>
      <Field
        label="Keywords"
        htmlFor="keywords"
        error={state.fieldErrors?.keywords}
      >
        <input
          className="app-field"
          id="keywords"
          name="keywords"
          defaultValue={keywords.join(", ")}
          placeholder="policy, governance, social development"
          aria-describedby="keywords-help"
        />
        <p
          id="keywords-help"
          className="mt-2 text-xs text-[color:var(--color-subtle)]"
        >
          Optional. Separate up to eight keywords with commas.
        </p>
      </Field>
      <FormMessage state={state} />
      <StepActions>
        <PendingButton>Save and continue</PendingButton>
      </StepActions>
    </form>
  );
}

const blankAuthor: SubmissionAuthorInput = {
  fullName: "",
  email: "",
  affiliation: "",
  orcid: "",
  isCorrespondingAuthor: true,
};

export function AuthorsStepForm({
  submissionId,
  version,
  initialAuthors,
}: {
  submissionId: string;
  version: number;
  initialAuthors: SubmissionAuthorInput[];
}) {
  const [authors, setAuthors] = useState(
    initialAuthors.length > 0 ? initialAuthors : [blankAuthor],
  );
  const bound = saveAuthorsAction.bind(null, submissionId);
  const [state, action] = useActionState(bound, initialActionState);

  function update(index: number, values: Partial<SubmissionAuthorInput>) {
    setAuthors((current) =>
      current.map((author, authorIndex) =>
        authorIndex === index ? { ...author, ...values } : author,
      ),
    );
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= authors.length) return;
    setAuthors((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <form action={action} className="max-w-4xl">
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="authors" value={JSON.stringify(authors)} />
      <div className="space-y-5">
        {authors.map((author, index) => (
          <fieldset
            key={index}
            className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5 sm:p-6"
          >
            <legend className="px-1 text-sm font-semibold">
              Author {index + 1}
            </legend>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-border)] pb-4">
              <label className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[color:var(--color-muted)]">
                <input
                  type="radio"
                  name="correspondingAuthor"
                  checked={author.isCorrespondingAuthor}
                  onChange={() =>
                    setAuthors((current) =>
                      current.map((item, itemIndex) => ({
                        ...item,
                        isCorrespondingAuthor: itemIndex === index,
                      })),
                    )
                  }
                  className="size-4 accent-[color:var(--color-accent)]"
                />
                Corresponding author
              </label>
              <div className="flex items-center gap-1">
                <AuthorControl
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  Move up
                </AuthorControl>
                <AuthorControl
                  onClick={() => move(index, 1)}
                  disabled={index === authors.length - 1}
                >
                  Move down
                </AuthorControl>
                {authors.length > 1 ? (
                  <AuthorControl
                    onClick={() =>
                      setAuthors((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    Remove
                  </AuthorControl>
                ) : null}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Full name"
                htmlFor={`author-${index}-name`}
                error={state.fieldErrors?.[`author-${index}-name`]}
              >
                <input
                  className="app-field"
                  id={`author-${index}-name`}
                  value={author.fullName}
                  onChange={(event) =>
                    update(index, { fullName: event.target.value })
                  }
                  required
                />
              </Field>
              <Field
                label="Email"
                htmlFor={`author-${index}-email`}
                error={state.fieldErrors?.[`author-${index}-email`]}
              >
                <input
                  className="app-field"
                  id={`author-${index}-email`}
                  type="email"
                  value={author.email}
                  onChange={(event) =>
                    update(index, { email: event.target.value })
                  }
                />
              </Field>
              <Field
                label="Affiliation"
                htmlFor={`author-${index}-affiliation`}
              >
                <input
                  className="app-field"
                  id={`author-${index}-affiliation`}
                  value={author.affiliation}
                  onChange={(event) =>
                    update(index, { affiliation: event.target.value })
                  }
                  placeholder="University or organization"
                />
              </Field>
              <Field
                label="ORCID"
                htmlFor={`author-${index}-orcid`}
                error={state.fieldErrors?.[`author-${index}-orcid`]}
              >
                <input
                  className="app-field"
                  id={`author-${index}-orcid`}
                  value={author.orcid}
                  onChange={(event) =>
                    update(index, { orcid: event.target.value })
                  }
                  placeholder="0000-0000-0000-0000"
                />
              </Field>
            </div>
          </fieldset>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          setAuthors((current) => [
            ...current,
            { ...blankAuthor, isCorrespondingAuthor: false },
          ])
        }
        className="button-secondary mt-5"
      >
        Add another author
      </button>
      <div className="mt-6">
        <FormMessage state={state} />
        {state.fieldErrors?.corresponding ? (
          <p className="mt-2 text-xs text-[color:var(--color-danger)]">
            {state.fieldErrors.corresponding}
          </p>
        ) : null}
      </div>
      <StepActions>
        <PendingButton>Save and continue</PendingButton>
      </StepActions>
    </form>
  );
}

export function FilesStep({
  submissionId,
  version,
  files,
}: {
  submissionId: string;
  version: number;
  files: SubmissionFileDTO[];
}) {
  const router = useRouter();
  const [activeType, setActiveType] = useState<FirstSubmissionFileType | null>(
    null,
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function upload(type: FirstSubmissionFileType, file: File) {
    const validation = validateUploadFile(file);
    if (validation) return setError(validation);
    setError("");
    setActiveType(type);
    setProgress(0);
    const body = new FormData();
    body.set("file", file);
    body.set("type", type);
    body.set("version", String(version));
    const request = new XMLHttpRequest();
    request.open("POST", `/api/author/submissions/${submissionId}/files`);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable)
        setProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      let response: { error?: string } = {};
      try {
        response = JSON.parse(request.responseText);
      } catch {}
      if (request.status < 200 || request.status >= 300) {
        setError(response.error ?? "The upload failed. Try again.");
        setActiveType(null);
        return;
      }
      setProgress(100);
      startTransition(() => router.refresh());
      setActiveType(null);
    });
    request.addEventListener("error", () => {
      setError("The network interrupted the upload. Try again.");
      setActiveType(null);
    });
    request.send(body);
  }

  return (
    <div className="max-w-4xl">
      <div className="space-y-4">
        {firstSubmissionFileTypes.map((type) => {
          const current = files.find((file) => file.type === type);
          return (
            <FileSlot
              key={type}
              type={type}
              file={current}
              required={type === "MANUSCRIPT"}
              uploading={activeType === type}
              progress={activeType === type ? progress : 0}
              disabled={activeType !== null || isPending}
              onFile={(file) => upload(type, file)}
              submissionId={submissionId}
              version={version}
            />
          );
        })}
      </div>
      <div className="mt-6 min-h-6" aria-live="polite">
        {error ? (
          <p role="alert" className="text-sm text-[color:var(--color-danger)]">
            {error}
          </p>
        ) : null}
      </div>
      <StepActions>
        <Link
          href={`/author/submissions/${submissionId}/edit/declarations`}
          className="button-primary"
        >
          Continue
        </Link>
      </StepActions>
    </div>
  );
}

function FileSlot({
  type,
  file,
  required,
  uploading,
  progress,
  disabled,
  onFile,
  submissionId,
  version,
}: {
  type: FirstSubmissionFileType;
  file?: SubmissionFileDTO;
  required: boolean;
  uploading: boolean;
  progress: number;
  disabled: boolean;
  onFile: (file: File) => void;
  submissionId: string;
  version: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  function dropped(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const selected = event.dataTransfer.files[0];
    if (selected && !disabled) onFile(selected);
  }
  return (
    <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-5 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">
            {submissionFileLabels[type]}
          </h2>
          <span className="text-[10px] font-semibold tracking-[0.08em] text-[color:var(--color-subtle)] uppercase">
            {required ? "Required" : "Optional"}
          </span>
        </div>
        {file ? (
          <p className="mt-2 text-sm break-all text-[color:var(--color-muted)]">
            {file.originalFileName} · {formatBytes(file.sizeBytes)}
          </p>
        ) : (
          <p className="mt-2 text-xs leading-5 text-[color:var(--color-subtle)]">
            PDF or DOCX, up to {maxSubmissionFileLabel}.
          </p>
        )}
        {uploading ? (
          <div className="mt-3" aria-live="polite">
            <div className="h-1 overflow-hidden rounded-full bg-[color:var(--color-border)]">
              <div
                className="h-full bg-[color:var(--color-accent)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-[color:var(--color-subtle)]">
              Uploading… {progress}%
            </p>
          </div>
        ) : null}
      </div>
      <div
        className="mt-4 flex flex-wrap gap-2 sm:mt-0"
        onDragOver={(event) => event.preventDefault()}
        onDrop={dropped}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) onFile(selected);
            event.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          className="button-secondary"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {file ? "Replace" : "Choose file"}
        </button>
        {file ? (
          <RemoveFileForm
            submissionId={submissionId}
            version={version}
            fileId={file.id}
          />
        ) : null}
      </div>
    </div>
  );
}

function RemoveFileForm({
  submissionId,
  version,
  fileId,
}: {
  submissionId: string;
  version: number;
  fileId: string;
}) {
  const bound = removeSubmissionFileAction.bind(null, submissionId);
  const [state, action] = useActionState(bound, initialActionState);
  return (
    <form action={action}>
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="submissionFileId" value={fileId} />
      <PendingButton className="button-secondary" pendingLabel="Removing…">
        Remove
      </PendingButton>
      {state.error ? (
        <span className="sr-only" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function DeclarationsStepForm({
  submissionId,
  version,
  values,
}: {
  submissionId: string;
  version: number;
  values: {
    declarationAccuracy: boolean;
    declarationAuthority: boolean;
    declarationReadiness: boolean;
  };
}) {
  const bound = saveDeclarationsAction.bind(null, submissionId);
  const [state, action] = useActionState(bound, initialActionState);
  return (
    <form action={action} className="max-w-3xl">
      <input type="hidden" name="version" value={version} />
      <div className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
        <Declaration
          name="declarationAccuracy"
          defaultChecked={values.declarationAccuracy}
        >
          The information provided in this submission is accurate to the best of
          my knowledge.
        </Declaration>
        <Declaration
          name="declarationAuthority"
          defaultChecked={values.declarationAuthority}
        >
          I am authorized by the listed authors to submit this manuscript for
          consideration.
        </Declaration>
        <Declaration
          name="declarationReadiness"
          defaultChecked={values.declarationReadiness}
        >
          This manuscript is ready to enter the journal’s editorial
          consideration process.
        </Declaration>
      </div>
      <div className="mt-6">
        <FormMessage state={state} />
      </div>
      <StepActions>
        <PendingButton>Save and continue</PendingButton>
      </StepActions>
    </form>
  );
}

export function FinalSubmitForm({
  submissionId,
  issues,
}: {
  submissionId: string;
  issues: string[];
}) {
  const bound = finalizeSubmissionAction.bind(null, submissionId);
  const [state, action] = useActionState(bound, initialActionState);
  return (
    <form action={action}>
      {issues.length > 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] p-4">
          <p className="text-sm font-semibold text-[color:var(--color-danger)]">
            Complete these items before submitting:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[color:var(--color-danger)]">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-6">
        <FormMessage state={state} />
      </div>
      <StepActions>
        <PendingButton
          pendingLabel="Submitting manuscript…"
          className="button-primary"
          disabled={issues.length > 0}
        >
          Submit manuscript
        </PendingButton>
      </StepActions>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-xs font-semibold text-[color:var(--color-foreground)]"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="mt-2 text-xs text-[color:var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function StepActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 flex justify-end border-t border-[color:var(--color-border)] pt-6">
      {children}
    </div>
  );
}

function AuthorControl({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-10 rounded-[var(--radius-sm)] px-2.5 text-[11px] font-semibold text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface-strong)] disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function Declaration({
  name,
  defaultChecked,
  children,
}: {
  name: string;
  defaultChecked: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid cursor-pointer grid-cols-[auto_1fr] gap-4 py-5 sm:px-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 size-4 accent-[color:var(--color-accent)]"
      />
      <span className="text-sm leading-6 text-[color:var(--color-foreground)]">
        {children}
      </span>
    </label>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
