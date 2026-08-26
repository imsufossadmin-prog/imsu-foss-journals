import Link from "next/link";

import { requireApplicationArea } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { AdminLegacyUploadForm } from "./form";

export default async function NewLegacyArticlePage() {
  await requireApplicationArea("admin");

  const journals = await prisma.journal.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      department: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl min-w-0 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link
          href="/admin/articles"
          className="text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
        >
          ← Content Directory
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-bold tracking-[-0.035em] text-[color:var(--color-foreground)] sm:text-4xl">
          Direct Publish Manuscript
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted)]">
          Directly publish manuscripts received offline, archived volumes, or
          past journal issues to the public catalog without requiring an author
          submission request.
        </p>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-6 sm:p-8">
        <AdminLegacyUploadForm journals={journals} />
      </div>
    </div>
  );
}
