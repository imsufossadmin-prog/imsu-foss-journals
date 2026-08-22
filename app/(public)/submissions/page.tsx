import Link from "next/link";

import { Container } from "@/components/ui/container";
import { publicSubmissionEntryPath } from "@/lib/auth/submission-entry";

const steps = [
  {
    title: "Contact the journal",
    description:
      "Start a submission request and talk with the Psychology journal team.",
  },
  {
    title: "Receive payment instructions",
    description:
      "The Journal Admin will explain the manual review-payment process.",
  },
  {
    title: "Upload your receipt",
    description:
      "After paying outside the platform, send your receipt securely in the conversation.",
  },
  {
    title: "Wait for confirmation",
    description:
      "The journal checks the receipt and enables article submission.",
  },
  {
    title: "Submit your article",
    description:
      "Complete the short article form and upload your PDF or DOCX manuscript.",
  },
  {
    title: "Receive your tracking ID",
    description:
      "The Journal Admin assigns the reference you will use for the manuscript.",
  },
  {
    title: "Follow the journal review",
    description:
      "Your conversation and manuscript record remain together as review continues.",
  },
] as const;

export default function SubmissionsPage() {
  return (
    <>
      <section className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
        <Container className="py-16 sm:py-24 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.14em] text-[color:var(--color-accent)] uppercase">
              Article submission
            </p>
            <h1 className="mt-5 font-serif text-5xl leading-[1.02] font-medium tracking-[-0.04em] text-[color:var(--color-foreground)] sm:text-6xl">
              Submit your article.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[color:var(--color-muted)] sm:text-lg">
              Start by contacting the journal. The Journal Admin will guide you
              through review payment, receipt confirmation, and manuscript
              submission.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href={publicSubmissionEntryPath}
                className="inline-flex min-h-12 items-center justify-center bg-[color:var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-accent)]"
              >
                Start submission request
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center border border-[color:var(--color-border-strong)] px-6 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-accent)]"
              >
                Sign in to your account
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="submission-process" className="bg-white">
        <Container className="py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-20">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-accent)] uppercase">
                How it works
              </p>
              <h2
                id="submission-process"
                className="mt-4 font-serif text-3xl font-medium tracking-[-0.03em] text-[color:var(--color-foreground)] sm:text-4xl"
              >
                A clear path from first contact to tracking ID.
              </h2>
            </div>
            <ol className="grid gap-x-10 border-t border-[color:var(--color-border)] sm:grid-cols-2">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4 border-b border-[color:var(--color-border)] py-6"
                >
                  <span className="font-mono text-xs font-semibold text-[color:var(--color-accent)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[color:var(--color-foreground)]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>
    </>
  );
}
