import "server-only";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { isSuperAdmin } from "@/lib/auth/permissions";
import {
  type EditorialBoardMember,
  type EditorialMemberCategory,
  getDefaultEditorialBoard,
  resolveCanonicalJournalSlug,
} from "@/lib/editorial/editorial-board-data";

// Durable file-backed store structure for governance / board overrides
interface PersistedJournalStore {
  boards: Record<string, EditorialBoardMember[]>;
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
    ? "test-journal-settings.json"
    : "journal-settings.json";
  return path.join(process.cwd(), ".data", fileName);
}

function readPersistedStore(): PersistedJournalStore {
  try {
    const filePath = getStoreFilePath();
    if (!fs.existsSync(filePath)) {
      return { boards: {} };
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      boards:
        parsed.boards && typeof parsed.boards === "object" ? parsed.boards : {},
    };
  } catch (error) {
    console.error("Failed to read persisted journal settings:", error);
    return { boards: {} };
  }
}

function writePersistedStore(store: PersistedJournalStore): void {
  try {
    const filePath = getStoreFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to persist journal settings to disk:", error);
  }
}

export function isAuthorizedForJournal(
  actor: Parameters<typeof isSuperAdmin>[0],
  canonicalSlug: string,
): boolean {
  if (!actor) return false;
  if (isSuperAdmin(actor)) return true;
  if (!actor.journalRoles || !Array.isArray(actor.journalRoles)) return false;

  return actor.journalRoles.some((r) => {
    if (r.role !== "JOURNAL_ADMIN") return false;
    if (r.journalId === canonicalSlug) return true;
    if (
      "journal" in r &&
      (r.journal as { slug?: string })?.slug === canonicalSlug
    ) {
      return true;
    }
    // Map aliases
    if (
      canonicalSlug === "njcp" &&
      (r.journalId === "psychology" ||
        ("journal" in r &&
          (r.journal as { slug?: string })?.slug === "psychology"))
    ) {
      return true;
    }
    if (
      canonicalSlug === "njsr" &&
      (r.journalId === "njsbr" ||
        ("journal" in r && (r.journal as { slug?: string })?.slug === "njsbr"))
    ) {
      return true;
    }
    if (
      canonicalSlug === "gjcsr" &&
      (r.journalId === "gjsbr" ||
        ("journal" in r && (r.journal as { slug?: string })?.slug === "gjsbr"))
    ) {
      return true;
    }
    return false;
  });
}

export async function getJournalEditorialBoard(
  journalSlug: string,
): Promise<EditorialBoardMember[]> {
  const canonical = resolveCanonicalJournalSlug(journalSlug);
  const store = readPersistedStore();
  if (store.boards[canonical] && Array.isArray(store.boards[canonical])) {
    return store.boards[canonical];
  }
  return getDefaultEditorialBoard(canonical);
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully ignore outside Next.js request/RSC context (e.g. unit tests)
  }
}

export async function addEditorialBoardMember({
  journalSlug,
  name,
  role,
  affiliation,
  category,
  actor,
}: {
  journalSlug: string;
  name: string;
  role: string;
  affiliation: string;
  category: EditorialMemberCategory;
  actor: Parameters<typeof isSuperAdmin>[0];
}): Promise<{
  success: boolean;
  error?: string;
  member?: EditorialBoardMember;
}> {
  const canonical = resolveCanonicalJournalSlug(journalSlug);
  if (!isAuthorizedForJournal(actor, canonical)) {
    return {
      success: false,
      error:
        "Unauthorized: Managing Editor permissions required for this journal.",
    };
  }

  if (!name.trim() || !role.trim()) {
    return {
      success: false,
      error: "Name and Role/Designation are required.",
    };
  }

  const currentMembers = await getJournalEditorialBoard(canonical);
  const newMember: EditorialBoardMember = {
    id: `${canonical}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    role: role.trim(),
    affiliation: affiliation.trim() || "Imo State University, Owerri, Nigeria",
    category,
    order: currentMembers.length + 1,
  };

  const updatedMembers = [...currentMembers, newMember];
  const store = readPersistedStore();
  store.boards[canonical] = updatedMembers;
  writePersistedStore(store);

  safeRevalidatePath(`/journals/${canonical}`);
  safeRevalidatePath(`/journals/${journalSlug}`);
  safeRevalidatePath("/editorial-board");
  safeRevalidatePath("/admin/editorial-board");

  return { success: true, member: newMember };
}

export async function updateEditorialBoardMember({
  journalSlug,
  memberId,
  name,
  role,
  affiliation,
  category,
  actor,
}: {
  journalSlug: string;
  memberId: string;
  name: string;
  role: string;
  affiliation: string;
  category: EditorialMemberCategory;
  actor: Parameters<typeof isSuperAdmin>[0];
}): Promise<{ success: boolean; error?: string }> {
  const canonical = resolveCanonicalJournalSlug(journalSlug);
  if (!isAuthorizedForJournal(actor, canonical)) {
    return {
      success: false,
      error:
        "Unauthorized: Managing Editor permissions required for this journal.",
    };
  }

  const currentMembers = await getJournalEditorialBoard(canonical);
  const memberIndex = currentMembers.findIndex((m) => m.id === memberId);
  if (memberIndex === -1) {
    return { success: false, error: "Editorial board member not found." };
  }

  const updatedMembers = [...currentMembers];
  updatedMembers[memberIndex] = {
    ...updatedMembers[memberIndex],
    name: name.trim(),
    role: role.trim(),
    affiliation: affiliation.trim(),
    category,
  };

  const store = readPersistedStore();
  store.boards[canonical] = updatedMembers;
  writePersistedStore(store);

  safeRevalidatePath(`/journals/${canonical}`);
  safeRevalidatePath(`/journals/${journalSlug}`);
  safeRevalidatePath("/editorial-board");
  safeRevalidatePath("/admin/editorial-board");

  return { success: true };
}

export async function deleteEditorialBoardMember({
  journalSlug,
  memberId,
  actor,
}: {
  journalSlug: string;
  memberId: string;
  actor: Parameters<typeof isSuperAdmin>[0];
}): Promise<{ success: boolean; error?: string }> {
  const canonical = resolveCanonicalJournalSlug(journalSlug);
  if (!isAuthorizedForJournal(actor, canonical)) {
    return {
      success: false,
      error:
        "Unauthorized: Managing Editor permissions required for this journal.",
    };
  }

  const currentMembers = await getJournalEditorialBoard(canonical);
  const updatedMembers = currentMembers.filter((m) => m.id !== memberId);
  const store = readPersistedStore();
  store.boards[canonical] = updatedMembers;
  writePersistedStore(store);

  safeRevalidatePath(`/journals/${canonical}`);
  safeRevalidatePath(`/journals/${journalSlug}`);
  safeRevalidatePath("/editorial-board");
  safeRevalidatePath("/admin/editorial-board");

  return { success: true };
}

export async function resetEditorialBoard({
  journalSlug,
  actor,
}: {
  journalSlug: string;
  actor: Parameters<typeof isSuperAdmin>[0];
}): Promise<{ success: boolean; error?: string }> {
  const canonical = resolveCanonicalJournalSlug(journalSlug);
  if (!isAuthorizedForJournal(actor, canonical)) {
    return {
      success: false,
      error:
        "Unauthorized: Managing Editor permissions required for this journal.",
    };
  }

  const store = readPersistedStore();
  delete store.boards[canonical];
  writePersistedStore(store);

  safeRevalidatePath(`/journals/${canonical}`);
  safeRevalidatePath(`/journals/${journalSlug}`);
  safeRevalidatePath("/editorial-board");
  safeRevalidatePath("/admin/editorial-board");

  return { success: true };
}
