import { isValidUuid } from "./validation";

interface RecipientQueryClient {
  userGlobalRole: {
    findMany: (args: {
      where: { role: string };
      select: { userId: boolean };
    }) => Promise<Array<{ userId: string }>>;
  };
  journalRoleAssignment: {
    findMany: (args: {
      where: { journalId: string; role: string };
      select: { userId: boolean };
    }) => Promise<Array<{ userId: string }>>;
  };
  reviewAssignment: {
    findMany: (args: {
      where: {
        reviewRound: { submissionId: string };
        status?: { notIn?: string[] };
      };
      select: { editorId: boolean };
    }) => Promise<Array<{ editorId: string }>>;
  };
  submission: {
    findUnique: (args: {
      where: { id: string };
      select: { id: boolean; ownerId: boolean; journalId: boolean };
    }) => Promise<{ id: string; ownerId: string; journalId: string } | null>;
  };
  submissionRequest: {
    findUnique: (args: {
      where: { id: string };
      select: { id: boolean; authorId: boolean; journalId: boolean };
    }) => Promise<{ id: string; authorId: string; journalId: string } | null>;
  };
}

async function getClient(db?: unknown): Promise<RecipientQueryClient> {
  if (db && typeof db === "object") {
    return db as RecipientQueryClient;
  }
  const { prisma } = await import("@/lib/db/prisma");
  return prisma as unknown as RecipientQueryClient;
}

/**
 * Resolves user IDs for all platform-wide Super Administrators.
 */
export async function resolveSuperAdminRecipients(
  db?: unknown,
): Promise<string[]> {
  const client = await getClient(db);
  const assignments = await client.userGlobalRole.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { userId: true },
  });

  const ids = new Set<string>();
  for (const item of assignments) {
    if (item?.userId && isValidUuid(item.userId)) {
      ids.add(item.userId);
    }
  }
  return Array.from(ids);
}

/**
 * Resolves user IDs for all Journal Administrators assigned to a specific journal.
 */
export async function resolveJournalAdminRecipients(
  journalId: string,
  db?: unknown,
): Promise<string[]> {
  if (!journalId || typeof journalId !== "string") {
    return [];
  }
  const cleanJournalId = journalId.trim();
  if (!cleanJournalId) return [];

  const client = await getClient(db);
  const assignments = await client.journalRoleAssignment.findMany({
    where: {
      journalId: cleanJournalId,
      role: "JOURNAL_ADMIN",
    },
    select: { userId: true },
  });

  const ids = new Set<string>();
  for (const item of assignments) {
    if (item?.userId && isValidUuid(item.userId)) {
      ids.add(item.userId);
    }
  }
  return Array.from(ids);
}

/**
 * Resolves recipients for manuscript lifecycle events.
 * Supports granular inclusion of the submitting Author, assigned Editors, and Journal Admins.
 */
export async function resolveManuscriptRecipients(
  submissionId: string,
  options: {
    includeAuthor?: boolean;
    includeAssignedEditors?: boolean;
    includeJournalAdmins?: boolean;
  } = {},
  db?: unknown,
): Promise<string[]> {
  if (!submissionId || typeof submissionId !== "string") {
    return [];
  }

  const {
    includeAuthor = true,
    includeAssignedEditors = true,
    includeJournalAdmins = false,
  } = options;

  const client = await getClient(db);
  const submission = await client.submission.findUnique({
    where: { id: submissionId.trim() },
    select: { id: true, ownerId: true, journalId: true },
  });

  if (!submission) {
    return [];
  }

  const recipients = new Set<string>();

  // 1. Submitting Author
  if (includeAuthor && submission.ownerId && isValidUuid(submission.ownerId)) {
    recipients.add(submission.ownerId);
  }

  // 2. Assigned Editors across review rounds for this manuscript
  if (includeAssignedEditors) {
    const assignments = await client.reviewAssignment.findMany({
      where: {
        reviewRound: { submissionId: submission.id },
        status: { notIn: ["CANCELLED", "DECLINED"] },
      },
      select: { editorId: true },
    });

    for (const a of assignments) {
      if (a?.editorId && isValidUuid(a.editorId)) {
        recipients.add(a.editorId);
      }
    }
  }

  // 3. Journal Administrators
  if (includeJournalAdmins && submission.journalId) {
    const journalAdmins = await resolveJournalAdminRecipients(
      submission.journalId,
      client,
    );
    for (const adminId of journalAdmins) {
      recipients.add(adminId);
    }
  }

  return Array.from(recipients);
}

/**
 * Resolves recipients for author-operator request communication events.
 */
export async function resolveRequestRecipients(
  requestId: string,
  options: {
    includeAuthor?: boolean;
    includeAdmins?: boolean;
  } = {},
  db?: unknown,
): Promise<string[]> {
  if (!requestId || typeof requestId !== "string") {
    return [];
  }

  const { includeAuthor = true, includeAdmins = true } = options;

  const client = await getClient(db);
  const request = await client.submissionRequest.findUnique({
    where: { id: requestId.trim() },
    select: { id: true, authorId: true, journalId: true },
  });

  if (!request) {
    return [];
  }

  const recipients = new Set<string>();

  // 1. Author
  if (includeAuthor && request.authorId && isValidUuid(request.authorId)) {
    recipients.add(request.authorId);
  }

  // 2. Administrators (Platform Super Admins + Department Journal Admins)
  if (includeAdmins) {
    const [superAdmins, journalAdmins] = await Promise.all([
      resolveSuperAdminRecipients(client),
      request.journalId
        ? resolveJournalAdminRecipients(request.journalId, client)
        : Promise.resolve([]),
    ]);

    for (const id of superAdmins) recipients.add(id);
    for (const id of journalAdmins) recipients.add(id);
  }

  return Array.from(recipients);
}
