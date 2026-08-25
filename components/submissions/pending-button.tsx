"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFormStatus } from "react-dom";

export function PendingButton({
  children,
  pendingLabel = "Saving…",
  className = "button-primary",
  disabled = false,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function PendingLinkButton({
  href,
  children,
  className = "button-secondary inline-flex items-center justify-center gap-2",
  pendingLabel = "Opening…",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          router.push(href);
        });
      }}
      className={className}
    >
      {isPending ? (
        <>
          <svg
            className="h-3.5 w-3.5 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
