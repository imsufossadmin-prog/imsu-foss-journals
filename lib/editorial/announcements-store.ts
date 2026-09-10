import "server-only";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { resolveCanonicalJournalSlug } from "@/lib/editorial/editorial-board-data";
import { isAuthorizedForJournal } from "@/lib/editorial/editorial-board-store";

export type AnnouncementCategory =
  "CALL_FOR_PAPERS" | "SPECIAL_ISSUE" | "EDITORIAL_UPDATE" | "GENERAL";

export interface Announcement {
  id: string;
  slug: string;
  title: string;
  category: AnnouncementCategory;
  targetJournal: string; // "ALL" | "njcp" | "ajsbs" | "njsr" | "gjcsr"
  content: string;
  publishedAt: string; // ISO string
  expiresAt?: string; // ISO string
  isActive: boolean;
  authorName: string;
}

interface PersistedAnnouncementsStore {
  announcements: Announcement[];
}

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-call-for-papers-2026",
    slug: "call-for-papers-2026-volume-11",
    title: "Call for Papers: 2026 Volume 11 Manuscript Submissions Now Open",
    category: "CALL_FOR_PAPERS",
    targetJournal: "ALL",
    content:
      "The Faculty of Social Sciences Journals (NJCP, AJSBS, NJSR, GJCSR) invite original empirical research papers, theoretical reviews, and methodological contributions for the 2026 publication volumes. Submissions undergo rapid, double-blind peer review with permanent CrossRef DOIs and Google Scholar indexing.",
    publishedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    isActive: true,
    authorName: "Editorial Directorate",
  },
  {
    id: "ann-special-issue-ajsbs",
    slug: "special-issue-african-social-behavioural-resilience",
    title:
      "Special Issue: African Social & Behavioural Resilience in the 21st Century",
    category: "SPECIAL_ISSUE",
    targetJournal: "ajsbs",
    content:
      "The African Journal of Social and Behavioural Sciences (AJSBS) announces a special themed section examining community resilience, institutional dynamics, and behavioral adaptations in Sub-Saharan Africa. Manuscripts formatted in APA 7th edition are welcomed from scholars across the continent and diaspora.",
    publishedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    isActive: true,
    authorName: "Prof. Ikechukwu J.D. Nwosu",
  },
  {
    id: "ann-review-speed-njcp",
    slug: "peer-review-turnaround-target",
    title: "Editorial Notice: 21-Day Expedited First-Decision Benchmark",
    category: "EDITORIAL_UPDATE",
    targetJournal: "njcp",
    content:
      "The Nigerian Journal of Contemporary Psychology (NJCP) editorial board has instituted a 21-day review benchmark for initial editorial decisions on submitted manuscripts. Authors can track progress live through their Author Operating Portal.",
    publishedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    isActive: true,
    authorName: "Prof Nkwam C. Uwaoma",
  },
];

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
    ? "test-announcements.json"
    : "announcements.json";
  return path.join(process.cwd(), ".data", fileName);
}

function readPersistedStore(): PersistedAnnouncementsStore {
  try {
    const filePath = getStoreFilePath();
    if (!fs.existsSync(filePath)) {
      return { announcements: DEFAULT_ANNOUNCEMENTS };
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      announcements: Array.isArray(parsed.announcements)
        ? parsed.announcements
        : DEFAULT_ANNOUNCEMENTS,
    };
  } catch (error) {
    console.error("Failed to read announcements store:", error);
    return { announcements: DEFAULT_ANNOUNCEMENTS };
  }
}

function writePersistedStore(store: PersistedAnnouncementsStore): void {
  try {
    const filePath = getStoreFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to persist announcements to disk:", error);
  }
}

export function resetAnnouncements(): void {
  writePersistedStore({ announcements: [...DEFAULT_ANNOUNCEMENTS] });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getPublicAnnouncements(
  journalSlug?: string,
): Promise<Announcement[]> {
  const store = readPersistedStore();
  let items = store.announcements.filter((a) => a.isActive);

  if (journalSlug && journalSlug !== "ALL") {
    const canonical = resolveCanonicalJournalSlug(journalSlug);
    items = items.filter(
      (a) => a.targetJournal === "ALL" || a.targetJournal === canonical,
    );
  }

  // Filter out expired items
  const now = new Date().toISOString();
  items = items.filter((a) => !a.expiresAt || a.expiresAt > now);

  return items.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export async function getAnnouncementBySlug(
  slug: string,
): Promise<Announcement | null> {
  const store = readPersistedStore();
  const found = store.announcements.find((a) => a.slug === slug);
  return found ?? null;
}

export async function getAnnouncements(
  actor: Parameters<typeof isSuperAdmin>[0],
  filter?: {
    journalSlug?: string;
    includeInactive?: boolean;
  },
): Promise<Announcement[]> {
  const store = readPersistedStore();
  let items = store.announcements;

  if (!filter?.includeInactive) {
    items = items.filter((a) => a.isActive);
  }

  if (!isSuperAdmin(actor)) {
    items = items.filter((a) => {
      if (a.targetJournal === "ALL") return true;
      return isAuthorizedForJournal(actor, a.targetJournal);
    });
  }

  if (filter?.journalSlug && filter.journalSlug !== "ALL") {
    const canonical = resolveCanonicalJournalSlug(filter.journalSlug);
    items = items.filter(
      (a) => a.targetJournal === "ALL" || a.targetJournal === canonical,
    );
  }

  return items.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export async function createAnnouncement({
  title,
  category,
  targetJournal,
  content,
  expiresAt,
  isActive = true,
  actor,
}: {
  title: string;
  category: AnnouncementCategory;
  targetJournal: string;
  content: string;
  expiresAt?: string;
  isActive?: boolean;
  actor: Parameters<typeof isSuperAdmin>[0];
}): Promise<{ success: boolean; error?: string; announcement?: Announcement }> {
  if (!title.trim() || !content.trim()) {
    return { success: false, error: "Title and Content are required." };
  }

  const normalizedJournal =
    targetJournal === "ALL"
      ? "ALL"
      : resolveCanonicalJournalSlug(targetJournal);

  const isAuthorized =
    isSuperAdmin(actor) ||
    normalizedJournal === "ALL" ||
    isAuthorizedForJournal(actor, normalizedJournal);

  if (!isAuthorized) {
    return {
      success: false,
      error:
        "Unauthorized: You do not have permission to publish announcements for this journal.",
    };
  }

  const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const slug = `${slugify(title)}-${Date.now().toString(36)}`;
  const authorEmail = (actor as { email?: string })?.email;
  const authorName = authorEmail ? authorEmail.split("@")[0] : "Administrator";

  const newAnn: Announcement = {
    id,
    slug,
    title: title.trim(),
    category,
    targetJournal: normalizedJournal,
    content: content.trim(),
    publishedAt: new Date().toISOString(),
    expiresAt: expiresAt?.trim() || undefined,
    isActive: Boolean(isActive),
    authorName,
  };

  const store = readPersistedStore();
  store.announcements.unshift(newAnn);
  writePersistedStore(store);

  try {
    revalidatePath("/");
    revalidatePath("/announcements");
    revalidatePath("/admin/announcements");
  } catch {
    // ignore outside Next.js request context
  }

  return { success: true, announcement: newAnn };
}

export async function updateAnnouncement({
  announcementId,
  title,
  category,
  targetJournal,
  content,
  expiresAt,
  isActive,
  actor,
}: {
  announcementId: string;
  title: string;
  category: AnnouncementCategory;
  targetJournal: string;
  content: string;
  expiresAt?: string;
  isActive: boolean;
  actor: Parameters<typeof isSuperAdmin>[0];
}): Promise<{ success: boolean; error?: string }> {
  const store = readPersistedStore();
  const annIndex = store.announcements.findIndex(
    (a) => a.id === announcementId,
  );

  if (annIndex === -1) {
    return { success: false, error: "Announcement not found." };
  }

  const existing = store.announcements[annIndex];
  const normalizedJournal =
    targetJournal === "ALL"
      ? "ALL"
      : resolveCanonicalJournalSlug(targetJournal);

  const isAuthorized =
    isSuperAdmin(actor) ||
    existing.targetJournal === "ALL" ||
    isAuthorizedForJournal(actor, existing.targetJournal);

  if (!isAuthorized) {
    return {
      success: false,
      error: "Unauthorized: Administrator permissions required.",
    };
  }

  store.announcements[annIndex] = {
    ...existing,
    title: title.trim(),
    category,
    targetJournal: normalizedJournal,
    content: content.trim(),
    expiresAt: expiresAt?.trim() || undefined,
    isActive: Boolean(isActive),
  };

  writePersistedStore(store);

  try {
    revalidatePath("/");
    revalidatePath("/announcements");
    revalidatePath("/admin/announcements");
  } catch {
    // ignore outside Next.js request context
  }

  return { success: true };
}

export async function deleteAnnouncement({
  announcementId,
  actor,
}: {
  announcementId: string;
  actor: Parameters<typeof isSuperAdmin>[0];
}): Promise<{ success: boolean; error?: string }> {
  const store = readPersistedStore();
  const annIndex = store.announcements.findIndex(
    (a) => a.id === announcementId,
  );

  if (annIndex === -1) {
    return { success: false, error: "Announcement not found." };
  }

  const existing = store.announcements[annIndex];
  const isAuthorized =
    isSuperAdmin(actor) ||
    existing.targetJournal === "ALL" ||
    isAuthorizedForJournal(actor, existing.targetJournal);

  if (!isAuthorized) {
    return {
      success: false,
      error: "Unauthorized: Administrator permissions required.",
    };
  }

  store.announcements.splice(annIndex, 1);
  writePersistedStore(store);

  try {
    revalidatePath("/");
    revalidatePath("/announcements");
    revalidatePath("/admin/announcements");
  } catch {
    // ignore outside Next.js request context
  }

  return { success: true };
}

export async function toggleAnnouncementActive({
  announcementId,
  actor,
}: {
  announcementId: string;
  actor: Parameters<typeof isSuperAdmin>[0];
}): Promise<{ success: boolean; error?: string; isActive?: boolean }> {
  const store = readPersistedStore();
  const annIndex = store.announcements.findIndex(
    (a) => a.id === announcementId,
  );

  if (annIndex === -1) {
    return { success: false, error: "Announcement not found." };
  }

  const existing = store.announcements[annIndex];
  const isAuthorized =
    isSuperAdmin(actor) ||
    existing.targetJournal === "ALL" ||
    isAuthorizedForJournal(actor, existing.targetJournal);

  if (!isAuthorized) {
    return {
      success: false,
      error: "Unauthorized: Administrator permissions required.",
    };
  }

  const newActive = !existing.isActive;
  store.announcements[annIndex].isActive = newActive;
  writePersistedStore(store);

  try {
    revalidatePath("/");
    revalidatePath("/announcements");
    revalidatePath("/admin/announcements");
  } catch {
    // ignore outside Next.js request context
  }

  return { success: true, isActive: newActive };
}
