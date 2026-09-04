import "server-only";

import type { GlobalRole } from "@prisma/client";
import { isBreakGlassSuperAdminEmail } from "@/lib/auth/provisioning";
import { isSuperAdmin } from "@/lib/auth/permissions";

export const DEFAULT_ACTIVE_JOURNAL_SLUGS = new Set([
  "psychology",
  "ajsbs",
  "gjsbr",
  "njsbr",
]);

export const GATED_DEPARTMENTAL_JOURNAL_SLUGS = new Set([
  "economics",
  "sociology",
  "public-administration",
  "criminology-security-studies",
  "library-information-science",
]);

export function normalizeJournalSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export const LEAD_SYSTEM_OWNER_EMAILS = new Set([
  "martinzkiziztto@gmail.com",
  "martinzkizitto@gmail.com",
]);

export function isLeadSystemOwner(user: {
  email?: string | null;
  globalRoles?: Array<{ role: GlobalRole }>;
}): boolean {
  if (!user?.email) return false;
  const isSuper = user.globalRoles
    ? isSuperAdmin({ globalRoles: user.globalRoles, journalRoles: [] })
    : true;
  const email = user.email.trim().toLowerCase();
  const envEmails = (process.env.LEAD_SYSTEM_OWNER_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
  const allowed = new Set([...LEAD_SYSTEM_OWNER_EMAILS, ...envEmails]);
  return isSuper && allowed.has(email);
}

export function isProtectedBreakGlassUser(user: {
  email?: string | null;
  globalRoles?: Array<{ role: GlobalRole }>;
}): boolean {
  return isLeadSystemOwner(user);
}

export interface JournalActivationStore {
  isActivated(slug: string): Promise<boolean>;
  activate(slug: string, activatedBy?: string): Promise<void>;
  deactivate(slug: string): Promise<void>;
  getActivationMap(): Promise<Record<string, boolean>>;
}

export class MemoryJournalActivationStore implements JournalActivationStore {
  private activated = new Set<string>();

  async isActivated(slug: string): Promise<boolean> {
    return this.activated.has(normalizeJournalSlug(slug));
  }

  async activate(slug: string): Promise<void> {
    this.activated.add(normalizeJournalSlug(slug));
  }

  async deactivate(slug: string): Promise<void> {
    this.activated.delete(normalizeJournalSlug(slug));
  }

  async getActivationMap(): Promise<Record<string, boolean>> {
    const map: Record<string, boolean> = {};
    for (const slug of DEFAULT_ACTIVE_JOURNAL_SLUGS) {
      map[slug] = true;
    }
    for (const slug of GATED_DEPARTMENTAL_JOURNAL_SLUGS) {
      map[slug] = this.activated.has(slug);
    }
    return map;
  }
}

export const prismaJournalActivationStore: JournalActivationStore = {
  async isActivated(slug: string): Promise<boolean> {
    if (!process.env.DATABASE_URL) return false;
    try {
      const { prisma } = await import("@/lib/db/prisma");
      const record = await prisma.journalActivation.findUnique({
        where: { journalSlug: slug },
      });
      return Boolean(record);
    } catch {
      return false;
    }
  },

  async activate(slug: string, activatedBy?: string): Promise<void> {
    if (!process.env.DATABASE_URL) return;
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.journalActivation.upsert({
      where: { journalSlug: slug },
      create: {
        journalSlug: slug,
        activatedBy: activatedBy ?? null,
      },
      update: {
        activatedBy: activatedBy ?? null,
        activatedAt: new Date(),
      },
    });
  },

  async deactivate(slug: string): Promise<void> {
    if (!process.env.DATABASE_URL) return;
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.journalActivation.deleteMany({
      where: { journalSlug: slug },
    });
  },

  async getActivationMap(): Promise<Record<string, boolean>> {
    if (!process.env.DATABASE_URL) {
      const fallback: Record<string, boolean> = {};
      for (const slug of DEFAULT_ACTIVE_JOURNAL_SLUGS) fallback[slug] = true;
      for (const slug of GATED_DEPARTMENTAL_JOURNAL_SLUGS)
        fallback[slug] = false;
      return fallback;
    }
    try {
      const { prisma } = await import("@/lib/db/prisma");
      const activatedRecords = await prisma.journalActivation.findMany({
        select: { journalSlug: true },
      });
      const activatedSet = new Set(
        activatedRecords.map((r) => normalizeJournalSlug(r.journalSlug)),
      );

      const map: Record<string, boolean> = {};
      for (const slug of DEFAULT_ACTIVE_JOURNAL_SLUGS) {
        map[slug] = true;
      }
      for (const slug of GATED_DEPARTMENTAL_JOURNAL_SLUGS) {
        map[slug] = activatedSet.has(slug);
      }
      return map;
    } catch {
      const fallback: Record<string, boolean> = {};
      for (const slug of DEFAULT_ACTIVE_JOURNAL_SLUGS) fallback[slug] = true;
      for (const slug of GATED_DEPARTMENTAL_JOURNAL_SLUGS)
        fallback[slug] = false;
      return fallback;
    }
  },
};

export async function isJournalActivated(
  slug: string,
  store: JournalActivationStore = prismaJournalActivationStore,
): Promise<boolean> {
  const normalized = normalizeJournalSlug(slug);
  if (DEFAULT_ACTIVE_JOURNAL_SLUGS.has(normalized)) {
    return true;
  }
  if (!GATED_DEPARTMENTAL_JOURNAL_SLUGS.has(normalized)) {
    // Any journal not in the gated departmental list is active by default (e.g. faculty journals)
    return true;
  }
  return store.isActivated(normalized);
}

export async function getJournalActivationMap(
  store: JournalActivationStore = prismaJournalActivationStore,
): Promise<Record<string, boolean>> {
  return store.getActivationMap();
}

export async function setJournalOperationalState({
  journalSlug,
  enabled,
  actor,
  store = prismaJournalActivationStore,
}: {
  journalSlug: string;
  enabled: boolean;
  actor: { email?: string | null; globalRoles?: Array<{ role: GlobalRole }> };
  store?: JournalActivationStore;
}): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizeJournalSlug(journalSlug);

  // 1. Authorization check: strictly Lead System Owner only
  if (!isLeadSystemOwner(actor)) {
    return {
      success: false,
      error:
        "Unauthorized: Only the Lead System Owner may modify journal operational status.",
    };
  }

  // 2. Baseline journals cannot be deactivated
  if (DEFAULT_ACTIVE_JOURNAL_SLUGS.has(normalized)) {
    return {
      success: false,
      error: "Baseline operational journals cannot be gated.",
    };
  }

  // 3. If database is available, verify journal exists and check active workflows on deactivation
  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/db/prisma");
      const journal = await prisma.journal.findUnique({
        where: { slug: normalized },
        select: { id: true, slug: true, name: true, departmentId: true },
      });

      if (!journal) {
        return { success: false, error: "Journal not found." };
      }

      // Faculty journals with null departments cannot be gated
      if (journal.departmentId === null) {
        return { success: false, error: "Faculty journals cannot be gated." };
      }

      if (!enabled) {
        // Prevent disabling a journal that has active workflows
        const [requestsCount, submissionsCount, articlesCount] =
          await Promise.all([
            prisma.submissionRequest.count({
              where: { journalId: journal.id },
            }),
            prisma.submission.count({ where: { journalId: journal.id } }),
            prisma.article.count({
              where: { issue: { volume: { journalId: journal.id } } },
            }),
          ]);

        if (requestsCount > 0 || submissionsCount > 0 || articlesCount > 0) {
          return {
            success: false,
            error: `Cannot disable ${journal.name}: active workflow records exist (${requestsCount} requests, ${submissionsCount} submissions, ${articlesCount} articles).`,
          };
        }
      }
    } catch {
      // In non-db test environments, proceed with store operation
    }
  }

  // 4. Perform activation or deactivation
  const previousState = await store.isActivated(normalized);
  if (enabled) {
    await store.activate(normalized, actor.email ?? undefined);
  } else {
    await store.deactivate(normalized);
  }

  // 5. Structured audit log entry
  console.info(
    `[AUDIT:JOURNAL_OPERATIONAL_STATE] journal=${normalized} previousState=${previousState ? "OPERATIONAL" : "GATED"} newState=${enabled ? "OPERATIONAL" : "GATED"} actor=${actor.email ?? "unknown"} timestamp=${new Date().toISOString()}`,
  );

  return { success: true };
}
