import type { ManagedRole } from "@prisma/client";

type ScopedRole = {
  role: "JOURNAL_ADMIN" | "EDITOR";
  journalId: string;
  departmentId: string;
};

export type RoleManagementActor = {
  id: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  scopedRoles: ScopedRole[];
};

export type RoleManagementTarget = {
  id: string;
  isActive: boolean;
};

export type RoleManagementScope = {
  journalId: string;
  departmentId: string;
  isActive: boolean;
  departmentIsActive: boolean;
} | null;

export type RoleChangePolicyInput = {
  actor: RoleManagementActor;
  target: RoleManagementTarget;
  role: ManagedRole;
  scope: RoleManagementScope;
};

export function getRoleChangeDenialReason({
  actor,
  target,
  role,
  scope,
}: RoleChangePolicyInput) {
  if (!actor.isActive) return "Your account is not active.";
  if (!target.isActive) return "The selected user is not active.";
  if (actor.id === target.id) return "You cannot change your own access.";

  if (role === "SUPER_ADMIN") {
    if (scope) return "Super Admin access cannot have a department scope.";
    return actor.isSuperAdmin
      ? null
      : "Only a Super Admin can change Super Admin access.";
  }

  if (!scope) return "Choose a department for this role.";
  if (!scope.isActive || !scope.departmentIsActive) {
    return "That department workspace is not active.";
  }
  if (actor.isSuperAdmin) return null;
  if (role !== "EDITOR") {
    return "Only a Super Admin can change Journal Admin access.";
  }

  return actor.scopedRoles.some(
    (assignment) =>
      assignment.role === "JOURNAL_ADMIN" &&
      assignment.departmentId === scope.departmentId,
  )
    ? null
    : "You can only change Editor access in your own department.";
}
