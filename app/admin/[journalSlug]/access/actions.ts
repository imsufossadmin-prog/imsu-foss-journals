"use server";

import { redirect } from "next/navigation";

import {
  assignManagedRole,
  removeManagedRole,
  RoleManagementError,
} from "@/lib/auth/role-management-session";

function path(slug: string, kind: "notice" | "error", message: string) {
  return `/admin/${slug}/access?${new URLSearchParams({ [kind]: message })}`;
}

async function changeEditor(
  operation: typeof assignManagedRole,
  journalId: string,
  journalSlug: string,
  formData: FormData,
) {
  let destination: string;
  try {
    const result = await operation({
      targetUserId: String(formData.get("targetUserId") ?? ""),
      role: "EDITOR",
      journalId,
    });
    destination = path(
      journalSlug,
      "notice",
      result.changed
        ? `${result.targetName}'s Editor access was updated.`
        : `${result.targetName}'s access is already up to date.`,
    );
  } catch (error) {
    destination = path(
      journalSlug,
      "error",
      error instanceof RoleManagementError
        ? error.message
        : "Editor access could not be updated.",
    );
  }
  redirect(destination);
}

export async function assignEditorAction(
  journalId: string,
  journalSlug: string,
  formData: FormData,
) {
  await changeEditor(assignManagedRole, journalId, journalSlug, formData);
}

export async function removeEditorAction(
  journalId: string,
  journalSlug: string,
  formData: FormData,
) {
  await changeEditor(removeManagedRole, journalId, journalSlug, formData);
}
