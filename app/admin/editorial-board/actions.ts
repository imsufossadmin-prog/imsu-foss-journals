"use server";

import { getCurrentUser } from "@/lib/auth/authorization";
import {
  addEditorialBoardMember,
  deleteEditorialBoardMember,
  resetEditorialBoard,
  updateEditorialBoardMember,
} from "@/lib/editorial/editorial-board-store";
import type { EditorialMemberCategory } from "@/lib/editorial/editorial-board-data";

export type EditorialActionState = {
  success?: boolean;
  error?: string;
};

export async function addEditorialBoardMemberAction(
  _prevState: EditorialActionState,
  formData: FormData,
): Promise<EditorialActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Authentication required." };
  }

  const journalSlug = formData.get("journalSlug")?.toString() ?? "";
  const name = formData.get("name")?.toString() ?? "";
  const role = formData.get("role")?.toString() ?? "";
  const affiliation = formData.get("affiliation")?.toString() ?? "";
  const category = (formData.get("category")?.toString() ??
    "BOARD_MEMBER") as EditorialMemberCategory;

  const res = await addEditorialBoardMember({
    journalSlug,
    name,
    role,
    affiliation,
    category,
    actor: user,
  });

  return res;
}

export async function updateEditorialBoardMemberAction(
  _prevState: EditorialActionState,
  formData: FormData,
): Promise<EditorialActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Authentication required." };
  }

  const journalSlug = formData.get("journalSlug")?.toString() ?? "";
  const memberId = formData.get("memberId")?.toString() ?? "";
  const name = formData.get("name")?.toString() ?? "";
  const role = formData.get("role")?.toString() ?? "";
  const affiliation = formData.get("affiliation")?.toString() ?? "";
  const category = (formData.get("category")?.toString() ??
    "BOARD_MEMBER") as EditorialMemberCategory;

  const res = await updateEditorialBoardMember({
    journalSlug,
    memberId,
    name,
    role,
    affiliation,
    category,
    actor: user,
  });

  return res;
}

export async function deleteEditorialBoardMemberAction(
  _prevState: EditorialActionState,
  formData: FormData,
): Promise<EditorialActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Authentication required." };
  }

  const journalSlug = formData.get("journalSlug")?.toString() ?? "";
  const memberId = formData.get("memberId")?.toString() ?? "";

  const res = await deleteEditorialBoardMember({
    journalSlug,
    memberId,
    actor: user,
  });

  return res;
}

export async function updateJournalMetadataAction(
  _prevState: EditorialActionState,
  formData: FormData,
): Promise<EditorialActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Authentication required." };
  }

  const journalSlug = formData.get("journalSlug")?.toString() ?? "";
  const issnPrint = formData.get("issnPrint")?.toString() ?? "";
  const issnOnline = formData.get("issnOnline")?.toString() ?? "";
  const frequency = formData.get("frequency")?.toString() ?? "";
  const referencingStyle = formData.get("referencingStyle")?.toString() ?? "";
  const showMetadataOnHomepage =
    formData.get("showMetadataOnHomepage") === "true" ||
    formData.get("showMetadataOnHomepage") === "on";

  const { updateJournalCustomMetadata } =
    await import("@/lib/editorial/editorial-board-store");

  const res = await updateJournalCustomMetadata({
    journalSlug,
    metadata: {
      issnPrint,
      issnOnline,
      frequency,
      referencingStyle,
      showMetadataOnHomepage,
    },
    actor: user,
  });

  return res;
}

export async function resetEditorialBoardAction(
  _prevState: EditorialActionState,
  formData: FormData,
): Promise<EditorialActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Authentication required." };
  }

  const journalSlug = formData.get("journalSlug")?.toString() ?? "";

  const res = await resetEditorialBoard({
    journalSlug,
    actor: user,
  });

  return res;
}

export async function toggleJournalMetadataVisibilityAction({
  journalSlug,
  isVisible,
}: {
  journalSlug: string;
  isVisible: boolean;
}): Promise<{ success?: boolean; error?: string; isVisible?: boolean }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Authentication required." };
  }

  const { toggleJournalMetadataVisibility } =
    await import("@/lib/editorial/editorial-board-store");

  return toggleJournalMetadataVisibility({
    journalSlug,
    isVisible,
    actor: user,
  });
}
