import Link from "next/link";
import { Container } from "@/components/ui/container";
import { publicSubmissionEntryPath } from "@/lib/auth/submission-entry";
import { siteConfig } from "@/lib/config/site";

export default function AboutPage() {
  return (
    <div className="space-y-16 py-12 sm:py-16">
      {/* Header Banner */}
      <section>
        <Container>
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold tracking-wider text-[color:var(--color-accent)] uppercase">
              About the Publishing Platform
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-5xl">
              Advancing Knowledge in the Social & Behavioural Sciences.
            </h1>
            <p className="mt-4 font-serif text-lg leading-relaxed text-[color:var(--color-muted)]">
              The official scholarly publishing center of the Faculty of Social
              Sciences (FOSS) at Imo State University (IMSU), Owerri, Nigeria.
            </p>
          </div>
        </Container>
      </section>

      {/* Main Body */}
      <section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
            {/* Left Column: Comprehensive Story */}
            <div className="space-y-10 text-sm leading-7 text-[color:var(--color-foreground)]">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
                  Faculty Overview & Academic Heritage
                </h2>
                <p className="mt-4 text-[color:var(--color-muted)]">
                  The Faculty of Social Sciences (FOSS) at Imo State University
                  (IMSU), Owerri, Nigeria, is one of the foremost faculties at
                  IMSU. As a distinguished faculty in academic research, FOSS is
                  dedicated to advancing knowledge in the fields of social and
                  behavioural sciences. Over the years, FOSS has built a strong
                  reputation for promoting research, innovation, and academic
                  excellence, with the aim of addressing local, national, and
                  global challenges.
                </p>
                <p className="mt-3 text-[color:var(--color-muted)]">
                  FOSS journals are scholarly, refereed, open-access,
                  high-quality and peer-reviewed journals in all social and
                  behavioural sciences fields utilising multi-dimensional
                  research approaches in the conduct of scholarly inquiry. These
                  approaches include theoretical, empirical, and experimental
                  methods.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
                  Key Faculty Journals
                </h2>
                <div className="mt-6 space-y-6">
                  <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
                    <div className="flex items-center justify-between font-mono text-xs text-[color:var(--color-accent)]">
                      <span className="font-bold">AJSBS (Est. 2009)</span>
                      <span>Flagship Journal</span>
                    </div>
                    <h3 className="mt-2 font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                      African Journal of Social and Behavioural Sciences
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                      Launched in 2009, AJSBS has become a trusted source of
                      peer-reviewed articles spanning political science, public
                      administration, public relations, communication,
                      geography, environmental management, information sciences,
                      sociology, psychology, psychotherapy, crime and
                      delinquency, economics, and financial management. AJSBS is
                      well-regarded for its high academic standards and
                      contributions to interdisciplinary research.
                    </p>
                  </div>

                  <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
                    <div className="flex items-center justify-between font-mono text-xs text-[color:var(--color-accent)]">
                      <span className="font-bold">GJSBR</span>
                      <span>Global Research</span>
                    </div>
                    <h3 className="mt-2 font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                      Global Journal of Social and Behavioural Research
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                      Designed to serve as a platform for global perspectives on
                      social and behavioural research. It encourages submissions
                      that explore the interconnected nature of human behaviour
                      and societal changes worldwide.
                    </p>
                  </div>

                  <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
                    <div className="flex items-center justify-between font-mono text-xs text-[color:var(--color-accent)]">
                      <span className="font-bold">NJSBR</span>
                      <span>Heritage & Regional Studies</span>
                    </div>
                    <h3 className="mt-2 font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                      Nwaebere Journal of Social and Behavioural Research
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                      Named to honour IMSU heritage, this journal focuses on
                      innovative research inspired by African contexts while
                      remaining relevant to global audiences, bridging regional
                      insights with broader academic discussions.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
                  Mission & Strategic Goal
                </h2>
                <p className="mt-3 text-[color:var(--color-muted)]">
                  Our goal is to create a robust and inclusive platform for
                  researchers, scholars, and practitioners to share knowledge,
                  collaborate, and contribute to solving pressing social and
                  behavioural issues. Through these journals, we strive to
                  promote excellence in research, uphold ethical standards, and
                  ensure the dissemination of valuable insights to a global
                  audience.
                </p>
              </div>
            </div>

            {/* Right Column: Institutional Details */}
            <div className="space-y-6">
              <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
                <h3 className="font-serif text-base font-semibold text-[color:var(--color-foreground)]">
                  Institutional Summary
                </h3>
                <dl className="mt-4 space-y-3 text-xs">
                  <div>
                    <dt className="font-mono text-[10px] text-[color:var(--color-subtle)] uppercase">
                      Institution
                    </dt>
                    <dd className="mt-0.5 font-semibold text-[color:var(--color-foreground)]">
                      {siteConfig.institution}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] text-[color:var(--color-subtle)] uppercase">
                      Faculty
                    </dt>
                    <dd className="mt-0.5 font-semibold text-[color:var(--color-foreground)]">
                      {siteConfig.faculty}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] text-[color:var(--color-subtle)] uppercase">
                      Location
                    </dt>
                    <dd className="mt-0.5 text-[color:var(--color-muted)]">
                      Owerri, Imo State, Nigeria
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] text-[color:var(--color-subtle)] uppercase">
                      Contact Emails
                    </dt>
                    <dd className="mt-0.5 font-mono text-[color:var(--color-accent)]">
                      fossjournals@gmail.com
                      <br />
                      ajsbs2016@gmail.com
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6">
                <h3 className="font-serif text-base font-semibold text-[color:var(--color-foreground)]">
                  Ready to Publish?
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-muted)]">
                  Submit your empirical or theoretical manuscript to the faculty
                  editorial board today.
                </p>
                <div className="mt-4">
                  <Link
                    href={publicSubmissionEntryPath}
                    className="button-primary inline-flex w-full items-center justify-center gap-2 py-2.5 text-xs font-semibold"
                  >
                    <span>Submit Manuscript</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
