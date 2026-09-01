"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { setJournalOperationalState } from "@/lib/editorial/journal-activation";

export async function setJournalOperationalStateAction(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const user = await requireAuthenticatedUser();
  const journalSlug = String(formData.get("journalSlug") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "true") === "true";

  if (!journalSlug) {
    return { error: "Journal is required." };
  }

  const result = await setJournalOperationalState({
    journalSlug,
    enabled,
    actor: user,
  });

  if (!result.success) {
    return { error: result.error };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/${journalSlug}`);
  revalidatePath("/workspaces");
  revalidatePath("/author");

  return { success: true };
}
