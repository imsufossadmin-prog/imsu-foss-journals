import Link from "next/link";

import { BrandMark } from "@/components/ui/brand-mark";

const messages = {
  inactive: {
    title: "This account is not active.",
    description:
      "Your identity is valid, but access to the journal platform has been paused. Contact a platform administrator if this is unexpected.",
  },
  journal: {
    title: "That journal workspace is unavailable.",
    description:
      "Your current memberships do not include this journal context. Choose one of your assigned workspaces instead.",
  },
  workspace: {
    title: "No workspace is available yet.",
    description:
      "Your account is authenticated, but it does not currently have an application role or active journal membership.",
  },
  author: {
    title: "An Author account is required.",
    description:
      "Your account is signed in, but it does not have permission to start a submission request. Choose one of your assigned workspaces or contact an administrator if you need Author access.",
  },
  default: {
    title: "You don’t have access to this workspace.",
    description:
      "Your account is signed in, but this area is outside your current role or journal context.",
  },
} as const;

type UnauthorizedPageProps = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function UnauthorizedPage({
  searchParams,
}: UnauthorizedPageProps) {
  const { reason } = await searchParams;
  const message =
    reason && reason in messages
      ? messages[reason as keyof typeof messages]
      : messages.default;

  return (
    <main className="min-h-screen bg-[color:var(--color-app-background)] px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col sm:min-h-[calc(100vh-4rem)]">
        <BrandMark />
        <div className="flex flex-1 items-center py-16">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
              Access notice
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-[1.08] font-medium tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-5xl">
              {message.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[color:var(--color-muted)]">
              {message.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/workspaces" className="button-primary">
                View my workspaces
              </Link>
              <Link href="/" className="button-secondary">
                Return to journal site
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
