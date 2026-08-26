import Link from "next/link";
import { Container } from "@/components/ui/container";
import { publicSubmissionEntryPath } from "@/lib/auth/submission-entry";
import { siteConfig } from "@/lib/config/site";

export default function ContactPage() {
  return (
    <div className="space-y-16 py-12 sm:py-16">
      <section>
        <Container>
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold tracking-wider text-[color:var(--color-accent)] uppercase">
              Secretariat & Enquiries
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-5xl">
              Contact the Editorial Secretariat
            </h1>
            <p className="mt-4 font-serif text-lg leading-relaxed text-[color:var(--color-muted)]">
              Get in touch with the editorial team and administration office of{" "}
              {siteConfig.faculty}, {siteConfig.institution}.
            </p>
          </div>
        </Container>
      </section>

      <section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            {/* Contact Details & Office info */}
            <div className="space-y-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 shadow-sm">
                  <span className="font-mono text-[10px] font-bold text-[color:var(--color-accent)] uppercase">
                    Official Emails
                  </span>
                  <h3 className="mt-2 font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                    Editorial & Submissions
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                    For manuscript queries, payment confirmations, and review
                    status:
                  </p>
                  <div className="mt-4 space-y-1.5 font-mono text-xs font-semibold text-[color:var(--color-accent)]">
                    <a
                      href="mailto:fossjournals@gmail.com"
                      className="block hover:underline"
                    >
                      fossjournals@gmail.com
                    </a>
                    <a
                      href="mailto:ajsbs2016@gmail.com"
                      className="block hover:underline"
                    >
                      ajsbs2016@gmail.com
                    </a>
                  </div>
                </div>

                <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 shadow-sm">
                  <span className="font-mono text-[10px] font-bold text-[color:var(--color-accent)] uppercase">
                    Physical Secretariat
                  </span>
                  <h3 className="mt-2 font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                    Faculty Office Location
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                    Dean’s Complex, Faculty of Social Sciences (FOSS),
                    <br />
                    Imo State University (IMSU),
                    <br />
                    P.M.B. 2000, Owerri, Imo State, Nigeria.
                  </p>
                </div>
              </div>

              {/* Office Hours & Turnaround Note */}
              <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8">
                <h3 className="font-serif text-xl font-semibold text-[color:var(--color-foreground)]">
                  Submission & Review Inquiries
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-[color:var(--color-muted)]">
                  The editorial team operates during standard university
                  academic hours. Authors using our digital portal receive
                  direct in-app responses through the interactive chatbox once a
                  submission request is opened.
                </p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <Link
                    href={publicSubmissionEntryPath}
                    className="button-primary inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold"
                  >
                    <span>Open Submission Request Online</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/submissions"
                    className="button-secondary inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold"
                  >
                    <span>View Author Guidelines</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="space-y-6">
              <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
                <h4 className="font-serif text-base font-semibold text-[color:var(--color-foreground)]">
                  Journals Under Secretariat
                </h4>
                <ul className="mt-4 space-y-3 text-xs text-[color:var(--color-muted)]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 rounded-full bg-[color:var(--color-accent)]" />
                    <span>
                      African Journal of Social & Behavioural Sciences (AJSBS)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 rounded-full bg-[color:var(--color-accent)]" />
                    <span>
                      Global Journal of Social & Behavioural Research (GJSBR)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 rounded-full bg-[color:var(--color-accent)]" />
                    <span>
                      Nwaebere Journal of Social & Behavioural Research (NJSBR)
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
