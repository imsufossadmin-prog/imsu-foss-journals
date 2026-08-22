import "server-only";

import type { JournalRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { getJournalWorkspaces } from "@/lib/auth/workspaces";
import { prisma } from "@/lib/db/prisma";

export async function requireJournalWorkspace(
  role: JournalRole,
  journalSlug: string,
) {
  const user = await requireAuthenticatedUser();
  const assignment = user.journalRoles.find(
    (item) =>
      item.role === role &&
      item.journal.slug === journalSlug &&
      item.journal.isActive,
  );

  let journal = assignment?.journal ?? null;

  if (!journal && isSuperAdmin(user)) {
    journal = await prisma.journal.findFirst({
      where: { slug: journalSlug, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        shortName: true,
        isActive: true,
        department: {
          select: { id: true, slug: true, name: true, isActive: true },
        },
      },
    });
  }

  if (!journal) redirect("/unauthorized?reason=journal");

  const journalWorkspaces = getJournalWorkspaces(user, role);

  return { user, journal, journalWorkspaces };
}
