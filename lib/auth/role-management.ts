import "server-only";

import { ManagedRole } from "@prisma/client";

import {
  getRoleChangeDenialReason,
  type RoleManagementActor,
  type RoleManagementScope,
} from "@/lib/auth/role-management-policy";
import { prisma } from "@/lib/db/prisma";

export class RoleManagementError extends Error {}

export type ManagedRoleInput = {
  targetUserId: string;
  role: ManagedRole;
  journalId?: string | null;
};

const actorSelect = {
  id: true,
  isActive: true,
  globalRoles: { select: { role: true } },
  journalRoles: {
    select: {
      journalId: true,
      role: true,
      journal: { select: { departmentId: true } },
    },
  },
} as const;

function asPolicyActor(
  actor: NonNullable<Awaited<ReturnType<typeof loadRoleManagementActor>>>,
): RoleManagementActor {
  return {
    id: actor.id,
    isActive: actor.isActive,
    isSuperAdmin: actor.globalRoles.some(({ role }) => role === "SUPER_ADMIN"),
    scopedRoles: actor.journalRoles.map(({ journalId, role, journal }) => ({
      journalId,
      role,
      departmentId: journal.departmentId,
    })),
  };
}

function loadRoleManagementActor(actorId: string) {
  return prisma.user.findUnique({
    where: { id: actorId },
    select: actorSelect,
  });
}

async function resolveRoleChange(actorId: string, input: ManagedRoleInput) {
  if (!Object.values(ManagedRole).includes(input.role)) {
    throw new RoleManagementError("Choose a valid role.");
  }

  const [actor, target, journal] = await Promise.all([
    loadRoleManagementActor(actorId),
    prisma.user.findUnique({
      where: { id: input.targetUserId },
      select: { id: true, isActive: true, displayName: true },
    }),
    input.journalId
      ? prisma.journal.findUnique({
          where: { id: input.journalId },
          select: {
            id: true,
            slug: true,
            isActive: true,
            departmentId: true,
            department: { select: { name: true, isActive: true } },
          },
        })
      : null,
  ]);

  if (!actor) throw new RoleManagementError("Your account is unavailable.");
  if (!target)
    throw new RoleManagementError("The selected user was not found.");
  if (input.journalId && !journal) {
    throw new RoleManagementError("The selected journal was not found.");
  }

  const scope: RoleManagementScope = journal
    ? {
        journalId: journal.id,
        departmentId: journal.departmentId,
        isActive: journal.isActive,
        departmentIsActive: journal.department
          ? journal.department.isActive
          : true,
      }
    : null;
  const denial = getRoleChangeDenialReason({
    actor: asPolicyActor(actor),
    target,
    role: input.role,
    scope,
  });
  if (denial) throw new RoleManagementError(denial);

  return { actor, target, journal };
}

export async function assignManagedRoleForActor(
  actorId: string,
  input: ManagedRoleInput,
) {
  const { target, journal } = await resolveRoleChange(actorId, input);
  const created = await prisma.$transaction(async (transaction) => {
    await transaction.userGlobalRole.upsert({
      where: {
        userId_role: { userId: input.targetUserId, role: "AUTHOR" },
      },
      update: {},
      create: { userId: input.targetUserId, role: "AUTHOR" },
    });

    const result =
      input.role === "SUPER_ADMIN"
        ? await transaction.userGlobalRole.createMany({
            data: [{ userId: input.targetUserId, role: "SUPER_ADMIN" }],
            skipDuplicates: true,
          })
        : await transaction.journalRoleAssignment.createMany({
            data: [
              {
                userId: input.targetUserId,
                journalId: journal!.id,
                role: input.role,
              },
            ],
            skipDuplicates: true,
          });

    if (result.count) {
      await transaction.roleChangeEvent.create({
        data: {
          actorId,
          targetUserId: input.targetUserId,
          role: input.role,
          action: "ASSIGNED",
          journalId: journal?.id,
        },
      });
    }
    return result.count;
  });

  return {
    changed: created === 1,
    targetName: target.displayName,
    journalSlug: journal?.slug ?? null,
  };
}

export async function removeManagedRoleForActor(
  actorId: string,
  input: ManagedRoleInput,
) {
  const { target, journal } = await resolveRoleChange(actorId, input);
  const removed = await prisma.$transaction(async (transaction) => {
    const result =
      input.role === "SUPER_ADMIN"
        ? await transaction.userGlobalRole.deleteMany({
            where: { userId: input.targetUserId, role: "SUPER_ADMIN" },
          })
        : await transaction.journalRoleAssignment.deleteMany({
            where: {
              userId: input.targetUserId,
              journalId: journal!.id,
              role: input.role,
            },
          });

    if (result.count) {
      await transaction.roleChangeEvent.create({
        data: {
          actorId,
          targetUserId: input.targetUserId,
          role: input.role,
          action: "REMOVED",
          journalId: journal?.id,
        },
      });
    }
    return result.count;
  });

  return {
    changed: removed === 1,
    targetName: target.displayName,
    journalSlug: journal?.slug ?? null,
  };
}
