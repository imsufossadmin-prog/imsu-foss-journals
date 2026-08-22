"use server";

import { ManagedRole } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  assignManagedRole,
  removeManagedRole,
  RoleManagementError,
} from "@/lib/auth/role-management-session";

function input(formData: FormData) {
  const role = String(formData.get("role") ?? "") as ManagedRole;
  if (!Object.values(ManagedRole).includes(role)) {
    throw new RoleManagementError("Choose a valid role.");
  }
  return {
    targetUserId: String(formData.get("targetUserId") ?? ""),
    role,
    journalId: String(formData.get("journalId") ?? "") || null,
  };
}

function resultPath(kind: "notice" | "error", message: string) {
  return `/admin/access?${new URLSearchParams({ [kind]: message })}`;
}

export async function assignRoleAction(formData: FormData) {
  let destination: string;
  try {
    const result = await assignManagedRole(input(formData));
    destination = resultPath(
      "notice",
      result.changed
        ? `${result.targetName}'s access was updated.`
        : `${result.targetName} already has that role.`,
    );
  } catch (error) {
    destination = resultPath(
      "error",
      error instanceof RoleManagementError
        ? error.message
        : "Access could not be updated.",
    );
  }
  redirect(destination);
}

export async function removeRoleAction(formData: FormData) {
  let destination: string;
  try {
    const result = await removeManagedRole(input(formData));
    destination = resultPath(
      "notice",
      result.changed
        ? `${result.targetName}'s role was removed.`
        : `${result.targetName} no longer has that role.`,
    );
  } catch (error) {
    destination = resultPath(
      "error",
      error instanceof RoleManagementError
        ? error.message
        : "Access could not be updated.",
    );
  }
  redirect(destination);
}
