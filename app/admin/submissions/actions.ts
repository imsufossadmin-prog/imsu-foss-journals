"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireApplicationArea } from "@/lib/auth/authorization";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { deleteManuscriptSubmission } from "@/lib/editorial/mutations";

function manageableJournalIds(
  user: Awaited<ReturnType<typeof requireApplicationArea>>,
) {
  if (isSuperAdmin(user)) return null;
  return user.journalRoles
    .filter(
      ({ role, journal }) =>
        role === "JOURNAL_ADMIN" &&
        journal.isActive &&
        (!journal.department || journal.department.isActive),
    )
    .map(({ journalId }) => journalId);
}

export async function deleteManuscriptAdminAction(
  submissionId: string,
  redirectTo?: string,
) {
  const user = await requireApplicationArea("admin");
  const journalIds = manageableJournalIds(user);

  const result = await deleteManuscriptSubmission({
    adminId: user.id,
    submissionId,
    journalIds,
  });

  revalidatePath("/admin/submissions");
  revalidatePath("/admin");
  revalidatePath(`/admin/${result.journalSlug}`);
  revalidatePath(`/admin/${result.journalSlug}/submissions`);
  revalidatePath("/author/submissions");
  revalidatePath("/author");

  if (redirectTo) {
    redirect(redirectTo);
  }

  return { success: true };
}
