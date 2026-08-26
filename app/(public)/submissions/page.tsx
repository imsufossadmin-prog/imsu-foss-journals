import Link from "next/link";
import { Container } from "@/components/ui/container";
import { publicSubmissionEntryPath } from "@/lib/auth/submission-entry";
import { siteConfig } from "@/lib/config/site";

export default function SubmissionsPage() {
  const guidelines = [
    {
      title: "Document Formatting",
      desc: "Manuscripts must be prepared using Microsoft Word, formatted on A4-sized paper with 1-inch margins on all sides. Double-spaced text in 12-point Times New Roman font.",
    },
    {
      title: "Article Length",
      desc: "Articles should not exceed 25 pages (maximum 8,000 words), inclusive of tables, figures, footnotes, and references.",
    },
    {
      title: "Title & Author Attribution",
      desc: "Cover page must clearly state paper title, author(s) full names in correct order (First Name, Middle Name, Surname), institutional affiliations, active email, and phone contact.",
    },
    {
      title: "Abstract & Keywords",
      desc: "An abstract of not more than 250 words summarising the study's purpose, methodology, empirical findings, and policy implications, accompanied by 4–6 relevant keywords.",
    },
    {
      title: "Body Structure",
      desc: "Standard academic progression: Introduction, Literature Review / Theoretical Framework, Methodology, Results / Data Presentation, Discussion, Conclusion & Recommendations.",
    },
    {
      title: "Referencing & Citation Standard",
      desc: "All citations and reference lists must strictly conform to APA 7th Edition guidelines.",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Manuscript Submission & Intake",
      desc: "Authors initiate a digital request through the portal or via official email (fossjournals@gmail.com / ajsbs2016@gmail.com) with a cover letter affirming original work.",
    },
    {
      step: "02",
      title: "Initial Screening & Verification",
      desc: "The editorial team screens the paper for scope, format compliance, and verifies the ₦10,000 peer review assessment fee.",
    },
    {
      step: "03",
      title: "Double-Blind Peer Review",
      desc: "Manuscripts are completely anonymised and sent to at least two subject matter specialists for rigorous, independent evaluation.",
    },
    {
      step: "04",
      title: "Feedback & Revisions",
      desc: "Authors receive structured reviewer recommendations (Accept, Minor Revision, Major Revision, or Reject) with a clear timeline for resubmission.",
    },
    {
      step: "05",
      title: "Final Decision & Production Fee",
      desc: "Upon final acceptance, the ₦25,000 publication fee is confirmed, and the paper enters copyediting, typesetting, and DOI assignment.",
    },
    {
      step: "06",
      title: "Receive your tracking ID & Global Indexing",
      desc: "The final paper is permanently assigned an official tracking ID, published with volume, issue, and CrossRef DOIs, streaming to global academic indexes.",
    },
  ];

  return (
    <div className="space-y-16 py-12 sm:py-16">
      {/* Header */}
      <section>
        <Container>
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold tracking-wider text-[color:var(--color-accent)] uppercase">
              Author Guidelines & Policies
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-5xl">
              Submit your article.
            </h1>
            <p className="mt-4 font-serif text-lg leading-relaxed text-[color:var(--color-muted)]">
              Comprehensive guidelines on manuscript preparation, submission
              fees, peer review policies, and research ethics for{" "}
              {siteConfig.faculty}, {siteConfig.institution}.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href={publicSubmissionEntryPath}
                className="button-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
              >
                <span>Start submission request</span>
                <span>→</span>
              </Link>
              <Link
                href="/login"
                className="button-secondary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
              >
                <span>Sign in to Track Submission</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Fee Schedule */}
      <section>
        <Container>
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-accent)]/30 bg-[color:var(--color-surface)] p-8 shadow-sm">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-[color:var(--color-accent)] uppercase">
                  Transparent Schedule
                </span>
                <h2 className="mt-1 font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
                  Publication & Review Fees
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                  To sustain independent peer-review operations, open-access
                  hosting, and digital DOI registration:
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 text-center">
                  <p className="font-mono text-[10px] text-[color:var(--color-subtle)] uppercase">
                    Non-Refundable Review Fee
                  </p>
                  <p className="mt-1 font-serif text-2xl font-bold text-[color:var(--color-accent)]">
                    ₦10,000
                  </p>
                  <p className="text-[10px] text-[color:var(--color-muted)]">
                    Upon manuscript intake
                  </p>
                </div>
                <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4 text-center">
                  <p className="font-mono text-[10px] text-[color:var(--color-subtle)] uppercase">
                    Publication & Production Fee
                  </p>
                  <p className="mt-1 font-serif text-2xl font-bold text-[color:var(--color-foreground)]">
                    ₦25,000
                  </p>
                  <p className="text-[10px] text-[color:var(--color-muted)]">
                    Payable only upon acceptance
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Manuscript Preparation Guidelines */}
      <section>
        <Container>
          <h2 className="font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
            Manuscript Preparation Guidelines
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {guidelines.map((item) => (
              <div
                key={item.title}
                className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6"
              >
                <h3 className="font-serif text-base font-semibold text-[color:var(--color-foreground)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 6-Step Workflow */}
      <section>
        <Container>
          <h2 className="font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
            Review & Publication Process
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((item) => (
              <div
                key={item.step}
                className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6"
              >
                <span className="font-mono text-xl font-bold text-[color:var(--color-accent)]">
                  {item.step}
                </span>
                <h3 className="mt-3 font-serif text-base font-semibold text-[color:var(--color-foreground)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Ethical & Plagiarism Policy */}
      <section>
        <Container>
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-8">
            <h2 className="font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
              Publication Ethics & Integrity
            </h2>
            <div className="mt-4 space-y-3 text-xs leading-relaxed text-[color:var(--color-muted)]">
              <p>
                • <strong>Originality & Plagiarism:</strong> Authors must ensure
                submitted works are entirely original. Papers with substantial
                plagiarism or simultaneous submissions elsewhere are immediately
                disqualified.
              </p>
              <p>
                • <strong>Human & Animal Ethics:</strong> Studies involving
                human or animal participants must provide evidence of
                institutional ethical approval and informed consent.
              </p>
              <p>
                • <strong>Conflict of Interest:</strong> All financial and
                personal affiliations that could bias results must be fully
                disclosed in the manuscript.
              </p>
            </div>
            <div className="mt-8">
              <Link
                href={publicSubmissionEntryPath}
                className="button-primary inline-flex items-center gap-2 px-8 py-3 text-sm font-semibold"
              >
                <span>Submit Manuscript Online</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
