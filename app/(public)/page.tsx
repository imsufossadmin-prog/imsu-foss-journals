import Link from "next/link";

import { Container } from "@/components/ui/container";
import { publicSubmissionEntryPath } from "@/lib/auth/submission-entry";
import { siteConfig } from "@/lib/config/site";

export default function Home() {
  return (
    <Container className="py-20 sm:py-28">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--color-accent)] uppercase">
          {siteConfig.faculty}
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-normal text-[color:var(--color-foreground)] sm:text-6xl">
          {siteConfig.name}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--color-muted)]">
          The digital academic publishing platform for the {siteConfig.faculty},{" "}
          {siteConfig.institution}.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/current-issue"
            className="inline-flex items-center justify-center border border-[color:var(--color-accent)] bg-[color:var(--color-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-[color:var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-accent)]"
          >
            View current issue
          </Link>
          <Link
            href={publicSubmissionEntryPath}
            className="inline-flex items-center justify-center border border-[color:var(--color-border)] px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-accent)]"
          >
            Start submission request
          </Link>
        </div>
      </div>
    </Container>
  );
}
