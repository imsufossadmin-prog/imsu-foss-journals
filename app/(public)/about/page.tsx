import { Container } from "@/components/ui/container";

export default function AboutPage() {
  return (
    <Container className="py-16 sm:py-24">
      <h1 className="text-3xl font-semibold text-[color:var(--color-foreground)] sm:text-4xl">
        About
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--color-muted)]">
        This section will be managed through the journal platform.
      </p>
    </Container>
  );
}
