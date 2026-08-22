import "server-only";

import type { Prisma } from "@prisma/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const provisionedUserInclude = {
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

export type TrustedAuthIdentity = Pick<
  SupabaseUser,
  "id" | "email" | "user_metadata"
>;

export type AuthorProfileInput = {
  id: string;
  email: string;
  displayName: string;
};

export type ProvisionedApplicationUser = Prisma.UserGetPayload<{
  include: typeof provisionedUserInclude;
}>;

export type AuthorProvisioningStore = {
  ensureAuthorProfile(
    input: AuthorProfileInput,
  ): Promise<ProvisionedApplicationUser>;
};

function trustedDisplayName(identity: TrustedAuthIdentity, email: string) {
  const metadataName = [
    identity.user_metadata.full_name,
    identity.user_metadata.name,
  ].find((value) => typeof value === "string" && value.trim());
  const fallback = email.split("@")[0]?.replace(/[._-]+/g, " ") || "Author";

  return String(metadataName ?? fallback)
    .trim()
    .slice(0, 160);
}

export function getAuthorProfileInput(identity: TrustedAuthIdentity) {
  const email = identity.email?.trim().toLowerCase();
  if (!email) throw new Error("The authenticated Google account has no email.");

  return {
    id: identity.id,
    email,
    displayName: trustedDisplayName(identity, email),
  };
}

const prismaAuthorProvisioningStore: AuthorProvisioningStore = {
  async ensureAuthorProfile(input) {
    const { prisma } = await import("@/lib/db/prisma");
    return prisma.$transaction(async (transaction) => {
      await transaction.user.upsert({
        where: { id: input.id },
        update: { email: input.email },
        create: input,
      });
      await transaction.userGlobalRole.upsert({
        where: { userId_role: { userId: input.id, role: "AUTHOR" } },
        update: {},
        create: { userId: input.id, role: "AUTHOR" },
      });

      return transaction.user.findUniqueOrThrow({
        where: { id: input.id },
        include: provisionedUserInclude,
      });
    });
  },
};

export function provisionAuthenticatedUser(
  identity: TrustedAuthIdentity,
  store: AuthorProvisioningStore = prismaAuthorProvisioningStore,
) {
  return store.ensureAuthorProfile(getAuthorProfileInput(identity));
}
