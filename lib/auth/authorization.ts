import "server-only";

import type {
  GlobalRole,
  JournalRole,
  SubmissionFileType,
} from "@prisma/client";
import { cache } from "react";
import { redirect } from "next/navigation";

import {
  canAccessApplicationArea,
  hasGlobalRole,
  hasJournalRole,
  isSuperAdmin,
  type ApplicationArea,
} from "@/lib/auth/permissions";
import {
  findActiveEditorAssignment,
  findOwnedSubmission,
} from "@/lib/auth/access-queries";
import { isBreakGlassSuperAdminEmail } from "@/lib/auth/provisioning";
import { prisma } from "@/lib/db/prisma";
import { SupabaseConfigurationError } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const applicationUserInclude = {
  globalRoles: true,
  journalRoles: {
    include: {
      journal: {
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
      },
    },
  },
} as const;

export const getCurrentUser = cache(async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser?.id) return null;

    const userId = authUser.id;
    const userEmail = authUser.email ?? null;

    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: applicationUserInclude,
    });

    if (userEmail && isBreakGlassSuperAdminEmail(userEmail)) {
      if (
        !user ||
        !user.isActive ||
        !user.globalRoles.some((gr) => gr.role === "SUPER_ADMIN")
      ) {
        await prisma.user.upsert({
          where: { id: userId },
          update: { email: userEmail, isActive: true },
          create: {
            id: userId,
            email: userEmail,
            displayName:
              authUser.user_metadata?.full_name ??
              authUser.user_metadata?.name ??
              "Super Admin",
            isActive: true,
          },
        });

        await prisma.userGlobalRole.upsert({
          where: { userId_role: { userId, role: "AUTHOR" } },
          update: {},
          create: { userId, role: "AUTHOR" },
        });

        await prisma.userGlobalRole.upsert({
          where: { userId_role: { userId, role: "SUPER_ADMIN" } },
          update: {},
          create: { userId, role: "SUPER_ADMIN" },
        });

        const refreshed = await prisma.user.findUnique({
          where: { id: userId },
          include: applicationUserInclude,
        });
        if (refreshed) return { ...refreshed, email: userEmail };
      }
    } else if (!user) {
      const { provisionAuthenticatedUser } =
        await import("@/lib/auth/provisioning");
      user = await provisionAuthenticatedUser(authUser);
    }

    if (!user) return null;

    return {
      ...user,
      email: userEmail,
    };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) return null;
    throw error;
  }
});

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (!user.isActive) redirect("/unauthorized?reason=inactive");

  return user;
}

export async function requireApplicationArea(area: ApplicationArea) {
  const user = await requireAuthenticatedUser();

  if (!canAccessApplicationArea(user, area)) redirect("/unauthorized");

  return user;
}

export async function requireGlobalRole(role: GlobalRole) {
  const user = await requireAuthenticatedUser();

  if (!hasGlobalRole(user, role)) redirect("/unauthorized");

  return user;
}

export async function requireJournalRole(
  journalId: string,
  roles: JournalRole | JournalRole[],
) {
  const user = await requireAuthenticatedUser();

  if (!isSuperAdmin(user) && !hasJournalRole(user, journalId, roles)) {
    redirect("/unauthorized");
  }

  return user;
}

export function hasDepartmentAdminAccess(
  user: Awaited<ReturnType<typeof requireAuthenticatedUser>>,
  departmentId: string,
) {
  return (
    isSuperAdmin(user) ||
    user.journalRoles.some(
      ({ role, journal }) =>
        role === "JOURNAL_ADMIN" &&
        journal.department?.id === departmentId &&
        journal.department?.isActive,
    )
  );
}

export async function requireSubmissionOwner(submissionId: string) {
  const user = await requireAuthenticatedUser();
  const submission = await findOwnedSubmission(prisma, user.id, submissionId);

  if (!submission) redirect("/unauthorized");

  return { user, submission };
}

export async function requireAssignedEditor(submissionId: string) {
  const user = await requireAuthenticatedUser();
  const assignment = await findActiveEditorAssignment(
    prisma,
    user.id,
    submissionId,
  );

  if (!assignment) redirect("/unauthorized");

  return { user, assignment };
}

export async function requireSubmissionFileAccess(
  submissionId: string,
  fileType: SubmissionFileType,
) {
  const user = await requireAuthenticatedUser();
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, journalId: true, ownerId: true },
  });

  if (!submission) redirect("/unauthorized");

  const hasAdministrativeAccess =
    isSuperAdmin(user) ||
    hasJournalRole(user, submission.journalId, "JOURNAL_ADMIN");
  const isOwner = submission.ownerId === user.id;

  const safeSubmission = { id: submission.id, journalId: submission.journalId };

  if (hasAdministrativeAccess || isOwner) {
    return { user, submission: safeSubmission };
  }

  if (
    !(["MANUSCRIPT", "REVISION"] as SubmissionFileType[]).includes(fileType)
  ) {
    redirect("/unauthorized");
  }

  const assignment = await prisma.reviewAssignment.findFirst({
    where: {
      editorId: user.id,
      status: { notIn: ["DECLINED", "CANCELLED"] },
      reviewRound: { submissionId },
    },
    select: { id: true },
  });

  if (!assignment) redirect("/unauthorized");

  return { user, submission: safeSubmission };
}
