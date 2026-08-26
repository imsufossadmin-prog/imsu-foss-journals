import Link from "next/link";
import { Container } from "@/components/ui/container";
import { publicSubmissionEntryPath } from "@/lib/auth/submission-entry";
import { siteConfig } from "@/lib/config/site";

export default function EditorialBoardPage() {
  const editorialTeam = [
    {
      role: "Founding Editor",
      name: "Prof. Nkwam C. Uwaoma",
      affiliation: "Faculty of Social Sciences, Imo State University",
    },
    {
      role: "Chief Editor",
      name: "Prof. Ikechukwu J.D. Nwosu",
      affiliation: "Faculty of Social Sciences, Imo State University",
    },
    {
      role: "Deputy Editor",
      name: "Vin O. Umeh, Ph.D.",
      affiliation: "Faculty of Social Sciences, Imo State University",
    },
    {
      role: "Managing Editor",
      name: "Richards E. Ebeh, Ph.D.",
      affiliation: "Faculty of Social Sciences, Imo State University",
    },
  ];

  const associateEditors = [
    "Prof. Agness Osita-Njoku",
    "Prof. Sam Ezeanyika",
    "Prof. Okechi D. Azuwike",
    "Prof. Andrew A. Igwemma",
    "Prof. B.J.C. Anyanwu",
    "Ngozi Sydney-Agbor, Ph.D.",
  ];

  const advisoryBoard = [
    "Prof. Nkwam C. Uwaoma",
    "Prof. B.T.O. Ikegwuoha",
    "Prof. Fabian Emerenini",
    "Prof. Benjamin Ehigie",
    "Prof. John Sambe",
    "Prof. Collins Nwaogwugwu",
    "Prof. Nchor Bichene Okorn",
    "Prof. Stanley Okafor",
  ];

  return (
    <div className="space-y-16 py-12 sm:py-16">
      {/* Header */}
      <section>
        <Container>
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold tracking-wider text-[color:var(--color-accent)] uppercase">
              Governance & Leadership
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-5xl">
              Editorial Board & Advisory Council
            </h1>
            <p className="mt-4 font-serif text-lg leading-relaxed text-[color:var(--color-muted)]">
              Distinguished academic leadership overseeing peer review rigor,
              ethics, and scholarly impact across {siteConfig.faculty},{" "}
              {siteConfig.institution}.
            </p>
          </div>
        </Container>
      </section>

      {/* Principal Editorial Leadership */}
      <section>
        <Container>
          <h2 className="font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
            Principal Editorial Officers
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {editorialTeam.map((member) => (
              <div
                key={member.role}
                className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 shadow-sm"
              >
                <div>
                  <span className="rounded bg-[color:var(--color-surface-strong)] px-2.5 py-1 font-mono text-[10px] font-bold text-[color:var(--color-accent)] uppercase">
                    {member.role}
                  </span>
                  <h3 className="mt-4 font-serif text-lg font-semibold text-[color:var(--color-foreground)]">
                    {member.name}
                  </h3>
                  <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                    {member.affiliation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Associate Editors Grid */}
      <section>
        <Container>
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8">
            <h2 className="font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
              Associate Editors
            </h2>
            <p className="mt-2 text-xs text-[color:var(--color-muted)]">
              Subject area specialists coordinating double-blind peer review
              across disciplines.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {associateEditors.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-4"
                >
                  <span className="size-2 rounded-full bg-[color:var(--color-accent)]" />
                  <span className="font-serif text-sm font-semibold text-[color:var(--color-foreground)]">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Advisory Board */}
      <section>
        <Container>
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-8">
            <h2 className="font-serif text-2xl font-semibold text-[color:var(--color-foreground)]">
              International Advisory Board
            </h2>
            <p className="mt-2 text-xs text-[color:var(--color-muted)]">
              Senior professors providing strategic guidance and ensuring
              compliance with global academic publishing ethics.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {advisoryBoard.map((name) => (
                <div
                  key={name}
                  className="rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 text-xs font-medium text-[color:var(--color-foreground)]"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href={publicSubmissionEntryPath}
              className="button-primary inline-flex items-center gap-2 px-8 py-3 text-sm font-semibold"
            >
              <span>Submit to the Editorial Board</span>
              <span>→</span>
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
