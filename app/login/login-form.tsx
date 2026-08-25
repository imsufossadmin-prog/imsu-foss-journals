"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  loginWithPassword,
  signInWithGoogle,
  type LoginState,
} from "@/app/login/actions";

const initialState: LoginState = {};

function DevelopmentSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="button-secondary relative mt-1 w-full disabled:cursor-wait disabled:opacity-75"
    >
      <span className={pending ? "opacity-0" : "opacity-100"}>Sign in</span>
      {pending ? (
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-4 animate-spin"
          >
            <circle
              cx="10"
              cy="10"
              r="7"
              fill="none"
              stroke="currentColor"
              strokeOpacity=".25"
              strokeWidth="2"
            />
            <path
              d="M10 3a7 7 0 0 1 7 7"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            />
          </svg>
          Signing in
        </span>
      ) : null}
    </button>
  );
}

function GoogleSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="button-primary relative flex w-full items-center justify-center gap-3 disabled:cursor-wait disabled:opacity-75"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
        <path
          fill="#4285F4"
          d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.6 4.6 0 0 1-2 3v2.8h3.3c1.9-1.8 2.9-4.4 2.9-7.9Z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.8c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.9A10 10 0 0 0 12 22Z"
        />
        <path
          fill="#FBBC05"
          d="M6.5 13.7a6 6 0 0 1 0-3.8V7H3.1a10 10 0 0 0 0 9.6l3.4-2.9Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.8c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.1 7l3.4 2.9A5.9 5.9 0 0 1 12 5.8Z"
        />
      </svg>
      <span>{pending ? "Opening Google…" : "Continue with Google"}</span>
    </button>
  );
}

export function LoginForm({
  returnTo,
  oauthError,
  showDevelopmentAccess = false,
}: {
  returnTo?: string;
  oauthError?: string;
  showDevelopmentAccess?: boolean;
}) {
  const [state, formAction] = useActionState(loginWithPassword, initialState);
  const [emailInput, setEmailInput] = useState("superadmin@example.com");
  const [passwordInput, setPasswordInput] = useState("password123456");

  return (
    <div className="mt-9">
      <form action={signInWithGoogle}>
        {returnTo ? (
          <input type="hidden" name="returnTo" value={returnTo} />
        ) : null}
        <GoogleSubmitButton />
      </form>
      <div aria-live="polite" className="min-h-12 pt-3">
        {oauthError ? (
          <p
            role="alert"
            className="rounded-[var(--radius-md)] border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] px-3.5 py-3 text-xs leading-5 font-medium text-[color:var(--color-danger)]"
          >
            Google sign-in is unavailable right now. Please try again shortly.
          </p>
        ) : null}
      </div>

      {showDevelopmentAccess ? (
        <details
          className="mt-5 border-t border-[color:var(--color-border)] pt-5"
          open
        >
          <summary className="cursor-pointer text-xs font-semibold text-[color:var(--color-subtle)]">
            Development access (Preset Credentials)
          </summary>

          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setEmailInput("superadmin@example.com");
                setPasswordInput("password123456");
              }}
              className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-2 text-left hover:border-[color:var(--color-accent)]"
            >
              <span className="block font-semibold text-[color:var(--color-foreground)]">
                🔑 Super Admin
              </span>
              <span className="text-[10px] text-[color:var(--color-subtle)]">
                superadmin@example.com
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmailInput("admin@example.com");
                setPasswordInput("password123456");
              }}
              className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-2 text-left hover:border-[color:var(--color-accent)]"
            >
              <span className="block font-semibold text-[color:var(--color-foreground)]">
                ✍️ Journal Admin
              </span>
              <span className="text-[10px] text-[color:var(--color-subtle)]">
                admin@example.com
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmailInput("editor@example.com");
                setPasswordInput("password123456");
              }}
              className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-2 text-left hover:border-[color:var(--color-accent)]"
            >
              <span className="block font-semibold text-[color:var(--color-foreground)]">
                🔍 Editor
              </span>
              <span className="text-[10px] text-[color:var(--color-subtle)]">
                editor@example.com
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmailInput("author@example.com");
                setPasswordInput("password123456");
              }}
              className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-2 text-left hover:border-[color:var(--color-accent)]"
            >
              <span className="block font-semibold text-[color:var(--color-foreground)]">
                📝 Author
              </span>
              <span className="text-[10px] text-[color:var(--color-subtle)]">
                author@example.com
              </span>
            </button>
          </div>

          <form action={formAction} className="mt-5 space-y-4" noValidate>
            {returnTo ? (
              <input type="hidden" name="returnTo" value={returnTo} />
            ) : null}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[color:var(--color-foreground)]"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="app-field mt-2"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[color:var(--color-foreground)]"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="app-field mt-2"
              />
            </div>
            <div aria-live="polite" className="min-h-11">
              {state.error ? (
                <p
                  role="alert"
                  className="rounded-[var(--radius-md)] border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] px-3.5 py-3 text-xs leading-5 font-medium text-[color:var(--color-danger)]"
                >
                  {state.error}
                </p>
              ) : null}
            </div>
            <DevelopmentSubmitButton />
          </form>
        </details>
      ) : null}
    </div>
  );
}
