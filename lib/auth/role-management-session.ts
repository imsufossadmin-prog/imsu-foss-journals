import "server-only";

import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import {
  assignManagedRoleForActor,
  removeManagedRoleForActor,
  RoleManagementError,
  type ManagedRoleInput,
} from "@/lib/auth/role-management";
import { prisma } from "@/lib/db/prisma";

export { RoleManagementError } from "@/lib/auth/role-management";

export async function assignManagedRole(input: ManagedRoleInput) {
  const actor = await requireAuthenticatedUser();
  return assignManagedRoleForActor(actor.id, input);
}

export async function removeManagedRole(input: ManagedRoleInput) {
  const actor = await requireAuthenticatedUser();
  return removeManagedRoleForActor(actor.id, input);
}

export async function searchRoleManagementUsers(query: string) {
  const actor = await requireAuthenticatedUser();
  const canManage =
    actor.globalRoles.some(({ role }) => role === "SUPER_ADMIN") ||
    actor.journalRoles.some(({ role }) => role === "JOURNAL_ADMIN");
  if (!canManage) throw new RoleManagementError("You cannot manage access.");

  const search = query.trim();
  const whereCondition =
    search.length >= 2
      ? {
          id: { not: actor.id },
          OR: [
            { displayName: { contains: search, mode: "insensitive" as const } },
            {
              email: {
                contains: search.toLowerCase(),
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : { id: { not: actor.id } };

  return prisma.user.findMany({
    where: whereCondition,
    select: {
      id: true,
      email: true,
      displayName: true,
      isActive: true,
      globalRoles: { select: { role: true } },
      journalRoles: {
        select: {
          id: true,
          role: true,
          journalId: true,
          journal: {
            select: {
              name: true,
              slug: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { displayName: "asc" },
    take: 12,
  });
}

export async function listRoleManagementJournals() {
  const actor = await requireAuthenticatedUser();
  if (!actor.globalRoles.some(({ role }) => role === "SUPER_ADMIN")) {
    throw new RoleManagementError("Only a Super Admin can manage staff roles.");
  }

  return prisma.journal.findMany({
    where: { isActive: true, department: { isActive: true } },
    select: {
      id: true,
      name: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
  });
}
