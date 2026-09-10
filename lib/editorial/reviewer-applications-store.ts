import "server-only";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { resolveCanonicalJournalSlug } from "@/lib/editorial/editorial-board-data";
import { isAuthorizedForJournal } from "@/lib/editorial/editorial-board-store";

export type ReviewerApplicationStatus = "PENDING" | "APPROVED" | "DECLINED";

export function formatAcademicName(
  academicTitle?: string,
  fullName?: string,
): string {
  const trimmedTitle = (academicTitle || "").trim();
  const trimmedName = (fullName || "").trim();
  if (!trimmedName) return "";
  if (!trimmedTitle) return trimmedName;

  const cleanTitle = trimmedTitle.replace(/\./g, "").toLowerCase();
  const firstWord = trimmedName.split(" ")[0].replace(/\./g, "").toLowerCase();

  if (
    firstWord === cleanTitle ||
    trimmedName.toLowerCase().startsWith(trimmedTitle.toLowerCase())
  ) {
    return trimmedName;
  }

  return `${trimmedTitle} ${trimmedName}`;
}

export interface ReviewerApplication {
  id: string;
  trackingCode: string;
  applicantUserId?: string;
  fullName: string;
  academicTitle: string;
  email: string;
  phone: string;
  affiliation: string;
  academicRank: string;
  specializationKeywords: string;
  targetJournal: string;
  profileUrl?: string;
  statement: string;
  status: ReviewerApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

interface PersistedReviewersStore {
  applications: ReviewerApplication[];
}

function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.execArgv.includes("--test") ||
    process.env.npm_lifecycle_event === "test" ||
    Boolean(process.env.TSX_TEST) ||
    Boolean(process.env.TEST)
  );
}

function getStoreFilePath(): string {
  const fileName = isTestEnvironment()
    ? "test-reviewer-applications.json"
    : "reviewer-applications.json";
  return path.join(process.cwd(), ".data", fileName);
}

export function resetReviewerApplications(): void {
  writePersistedStore({ applications: [] });
}

function readPersistedStore(): PersistedReviewersStore {
  try {
    const filePath = getStoreFilePath();
    if (!fs.existsSync(filePath)) {
      return { applications: [] };
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      applications: Array.isArray(parsed.applications)
        ? parsed.applications
        : [],
    };
  } catch (error) {
    console.error("Failed to read reviewer applications store:", error);
    return { applications: [] };
  }
}

function writePersistedStore(store: PersistedReviewersStore): void {
  try {
    const filePath = getStoreFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to persist reviewer applications to disk:", error);
  }
}

function generateTrackingCode(targetJournal: string): string {
  const prefix = targetJournal === "ALL" ? "FOSS" : targetJournal.toUpperCase();
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `REV-${prefix}-${year}-${random}`;
}

export async function createReviewerApplication(input: {
  fullName: string;
  academicTitle: string;
  email: string;
  phone: string;
  affiliation: string;
  academicRank: string;
  specializationKeywords: string;
  targetJournal: string;
  profileUrl?: string;
  statement: string;
  applicantUserId?: string;
}): Promise<{
  success: boolean;
  error?: string;
  trackingCode?: string;
  application?: ReviewerApplication;
}> {
  if (
    !input.fullName.trim() ||
    !input.email.trim() ||
    !input.affiliation.trim() ||
    !input.specializationKeywords.trim()
  ) {
    return {
      success: false,
      error:
        "Full Name, Email, Institutional Affiliation, and Specialization Keywords are required.",
    };
  }

  const normalizedJournal =
    input.targetJournal === "ALL"
      ? "ALL"
      : resolveCanonicalJournalSlug(input.targetJournal);

  const trackingCode = generateTrackingCode(normalizedJournal);
  const newApp: ReviewerApplication = {
    id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    trackingCode,
    applicantUserId: input.applicantUserId?.trim() || undefined,
    fullName: input.fullName.trim(),
    academicTitle: input.academicTitle.trim() || "Dr.",
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    affiliation: input.affiliation.trim(),
    academicRank: input.academicRank.trim() || "Senior Lecturer",
    specializationKeywords: input.specializationKeywords.trim(),
    targetJournal: normalizedJournal,
    profileUrl: input.profileUrl?.trim() || undefined,
    statement: input.statement.trim(),
    status: "PENDING",
    submittedAt: new Date().toISOString(),
  };

  const store = readPersistedStore();
  store.applications.unshift(newApp);
  writePersistedStore(store);

  try {
    revalidatePath("/admin/reviewers");
  } catch {
    // ignore outside Next.js request context
  }

  return { success: true, trackingCode, application: newApp };
}

export async function getReviewerApplicationForUser(user: {
  id?: string;
  email?: string;
}): Promise<ReviewerApplication | null> {
  const store = readPersistedStore();
  const email = user.email?.trim().toLowerCase();
  const userId = user.id?.trim();

  if (!email && !userId) return null;

  const found = store.applications.find(
    (a) =>
      (userId && a.applicantUserId === userId) ||
      (email && a.email.toLowerCase() === email),
  );
  return found ?? null;
}

export async function getReviewerApplications(
  actor: Parameters<typeof isSuperAdmin>[0],
  filter?: {
    journalSlug?: string;
    status?: ReviewerApplicationStatus;
  },
): Promise<ReviewerApplication[]> {
  const store = readPersistedStore();
  let apps = store.applications;

  // Filter based on user authorization
  if (!isSuperAdmin(actor)) {
    apps = apps.filter((app) => {
      if (app.targetJournal === "ALL") return true;
      return isAuthorizedForJournal(actor, app.targetJournal);
    });
  }

  if (filter?.journalSlug && filter.journalSlug !== "ALL") {
    const canonical = resolveCanonicalJournalSlug(filter.journalSlug);
    apps = apps.filter(
      (a) => a.targetJournal === canonical || a.targetJournal === "ALL",
    );
  }

  if (filter?.status) {
    apps = apps.filter((a) => a.status === filter.status);
  }

  return apps;
}

export async function updateReviewerApplicationStatus({
  applicationId,
  status,
  actor,
}: {
  applicationId: string;
  status: ReviewerApplicationStatus;
  actor: Parameters<typeof isSuperAdmin>[0];
}): Promise<{ success: boolean; error?: string }> {
  const store = readPersistedStore();
  const appIndex = store.applications.findIndex((a) => a.id === applicationId);

  if (appIndex === -1) {
    return { success: false, error: "Reviewer application not found." };
  }

  const app = store.applications[appIndex];
  const isAuthorized =
    isSuperAdmin(actor) ||
    app.targetJournal === "ALL" ||
    isAuthorizedForJournal(actor, app.targetJournal);

  if (!isAuthorized) {
    return {
      success: false,
      error:
        "Unauthorized: You do not have permission to manage this application.",
    };
  }

  store.applications[appIndex] = {
    ...app,
    status,
    reviewedAt: new Date().toISOString(),
    reviewedBy: (actor as { email?: string })?.email ?? "Administrator",
  };

  writePersistedStore(store);

  // If approved, automatically assign the EDITOR role in the database
  if (status === "APPROVED") {
    try {
      const { prisma } = await import("@/lib/db/prisma");
      const { getJournalDbSlugs } =
        await import("@/lib/editorial/editorial-board-data");

      const targetUser = app.applicantUserId
        ? await prisma.user.findUnique({
            where: { id: app.applicantUserId },
          })
        : await prisma.user.findUnique({
            where: { email: app.email },
          });

      if (targetUser) {
        let journalSlugsToAssign: string[] = [];
        if (app.targetJournal === "ALL") {
          if (!isSuperAdmin(actor)) {
            const actorJournals = (
              actor as {
                journalRoles?: Array<{ journal?: { slug: string } }>;
              }
            )?.journalRoles
              ?.map((r) => r.journal?.slug)
              .filter(Boolean) as string[];
            journalSlugsToAssign =
              actorJournals && actorJournals.length > 0
                ? actorJournals
                : ["njcp", "ajsbs", "njsr", "gjcsr"];
          } else {
            journalSlugsToAssign = ["njcp", "ajsbs", "njsr", "gjcsr"];
          }
        } else {
          journalSlugsToAssign = [app.targetJournal];
        }

        const allDbSlugs = journalSlugsToAssign.flatMap((s) =>
          getJournalDbSlugs(s),
        );
        const journals = await prisma.journal.findMany({
          where: { slug: { in: allDbSlugs }, isActive: true },
        });

        const actorId = (actor as { id?: string })?.id;

        for (const j of journals) {
          await prisma.journalRoleAssignment.upsert({
            where: {
              userId_journalId_role: {
                userId: targetUser.id,
                journalId: j.id,
                role: "EDITOR",
              },
            },
            update: {},
            create: {
              userId: targetUser.id,
              journalId: j.id,
              role: "EDITOR",
            },
          });

          if (actorId) {
            try {
              await prisma.roleChangeEvent.create({
                data: {
                  actorId,
                  targetUserId: targetUser.id,
                  role: "EDITOR",
                  action: "ASSIGNED",
                  journalId: j.id,
                },
              });
            } catch {
              // Ignore audit log error if actorId is synthetic in test mocks
            }
          }
        }
      }
    } catch (error) {
      console.error(
        "Failed to auto-assign EDITOR role on reviewer approval:",
        error,
      );
    }
  }

  try {
    revalidatePath("/admin/reviewers");
    revalidatePath("/workspaces");
  } catch {
    // ignore outside Next.js request context
  }

  return { success: true };
}

export async function deleteReviewerApplication({
  applicationId,
  actor,
}: {
  applicationId: string;
  actor: Parameters<typeof isSuperAdmin>[0];
}): Promise<{ success: boolean; error?: string }> {
  const store = readPersistedStore();
  const appIndex = store.applications.findIndex((a) => a.id === applicationId);

  if (appIndex === -1) {
    return { success: false, error: "Reviewer application not found." };
  }

  const app = store.applications[appIndex];
  const isAuthorized =
    isSuperAdmin(actor) ||
    app.targetJournal === "ALL" ||
    isAuthorizedForJournal(actor, app.targetJournal);

  if (!isAuthorized) {
    return {
      success: false,
      error:
        "Unauthorized: You do not have permission to delete this application.",
    };
  }

  store.applications.splice(appIndex, 1);
  writePersistedStore(store);

  try {
    revalidatePath("/admin/reviewers");
  } catch {
    // ignore outside Next.js request context
  }

  return { success: true };
}
