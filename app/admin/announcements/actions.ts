"use server";

import { getCurrentUser } from "@/lib/auth/authorization";
import {
  createAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
  updateAnnouncement,
  type AnnouncementCategory,
  type Announcement,
} from "@/lib/editorial/announcements-store";

export type AdminAnnouncementActionState = {
  success?: boolean;
  error?: string;
  announcement?: Announcement;
  isActive?: boolean;
};

export async function createAnnouncementAction(
  _prevState: AdminAnnouncementActionState,
  formData: FormData,
): Promise<AdminAnnouncementActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Authentication required." };

  const title = formData.get("title")?.toString() ?? "";
  const category = (formData.get("category")?.toString() ??
    "GENERAL") as AnnouncementCategory;
  const targetJournal = formData.get("targetJournal")?.toString() ?? "ALL";
  const content = formData.get("content")?.toString() ?? "";
  const expiresAt = formData.get("expiresAt")?.toString() ?? "";
  const isActive =
    formData.get("isActive") === "true" || formData.get("isActive") === "on";

  return createAnnouncement({
    title,
    category,
    targetJournal,
    content,
    expiresAt: expiresAt || undefined,
    isActive,
    actor: user,
  });
}

export async function updateAnnouncementAction(
  _prevState: AdminAnnouncementActionState,
  formData: FormData,
): Promise<AdminAnnouncementActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Authentication required." };

  const announcementId = formData.get("announcementId")?.toString() ?? "";
  const title = formData.get("title")?.toString() ?? "";
  const category = (formData.get("category")?.toString() ??
    "GENERAL") as AnnouncementCategory;
  const targetJournal = formData.get("targetJournal")?.toString() ?? "ALL";
  const content = formData.get("content")?.toString() ?? "";
  const expiresAt = formData.get("expiresAt")?.toString() ?? "";
  const isActive =
    formData.get("isActive") === "true" || formData.get("isActive") === "on";

  return updateAnnouncement({
    announcementId,
    title,
    category,
    targetJournal,
    content,
    expiresAt: expiresAt || undefined,
    isActive,
    actor: user,
  });
}

export async function deleteAnnouncementAction(
  _prevState: AdminAnnouncementActionState,
  formData: FormData,
): Promise<AdminAnnouncementActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Authentication required." };

  const announcementId = formData.get("announcementId")?.toString() ?? "";

  return deleteAnnouncement({
    announcementId,
    actor: user,
  });
}

export async function toggleAnnouncementActiveAction(
  _prevState: AdminAnnouncementActionState,
  formData: FormData,
): Promise<AdminAnnouncementActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Authentication required." };

  const announcementId = formData.get("announcementId")?.toString() ?? "";

  return toggleAnnouncementActive({
    announcementId,
    actor: user,
  });
}
