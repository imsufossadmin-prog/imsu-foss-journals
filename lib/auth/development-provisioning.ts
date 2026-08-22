import "server-only";

import { GlobalRole, JournalRole } from "@prisma/client";

export type DevelopmentProvisioningInput = {
  email: string;
  password: string;
  displayName: string;
  role: GlobalRole | JournalRole;
  journalSlug?: string;
};

export type DevelopmentAuthProvisioningStore = {
  findUserIdByEmail(email: string): Promise<string | null>;
  createUser(email: string, password: string): Promise<string>;
  updateUser(userId: string, password: string): Promise<void>;
};

export type DevelopmentApplicationProvisioningStore = {
  findJournalIdBySlug(slug: string): Promise<string | null>;
  upsertUser(input: {
    id: string;
    email: string;
    displayName: string;
  }): Promise<void>;
  ensureGlobalRole(userId: string, role: GlobalRole): Promise<void>;
  ensureJournalRole(
    userId: string,
    journalId: string,
    role: JournalRole,
  ): Promise<void>;
};

export async function provisionDevelopmentUser(
  input: DevelopmentProvisioningInput,
  stores: {
    auth: DevelopmentAuthProvisioningStore;
    application: DevelopmentApplicationProvisioningStore;
  },
) {
  const isGlobalRole = Object.values(GlobalRole).includes(
    input.role as GlobalRole,
  );
  let journalId: string | null = null;

  if (!isGlobalRole) {
    if (!input.journalSlug) {
      throw new Error(
        "DEV_USER_JOURNAL_SLUG is required for journal-scoped roles.",
      );
    }
    journalId = await stores.application.findJournalIdBySlug(input.journalSlug);
    if (!journalId) throw new Error(`Journal not found: ${input.journalSlug}`);
  }

  let authUserId = await stores.auth.findUserIdByEmail(input.email);
  if (authUserId) {
    await stores.auth.updateUser(authUserId, input.password);
  } else {
    try {
      authUserId = await stores.auth.createUser(input.email, input.password);
    } catch (error) {
      authUserId = await stores.auth.findUserIdByEmail(input.email);
      if (!authUserId) throw error;
      await stores.auth.updateUser(authUserId, input.password);
    }
  }

  await stores.application.upsertUser({
    id: authUserId,
    email: input.email,
    displayName: input.displayName,
  });
  await stores.application.ensureGlobalRole(authUserId, GlobalRole.AUTHOR);

  if (isGlobalRole) {
    if (input.role !== GlobalRole.AUTHOR) {
      await stores.application.ensureGlobalRole(
        authUserId,
        input.role as GlobalRole,
      );
    }
  } else {
    await stores.application.ensureJournalRole(
      authUserId,
      journalId!,
      input.role as JournalRole,
    );
  }

  return authUserId;
}
