"use server";

import { getCurrentUser } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
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

  let imageUrl: string | undefined = undefined;
  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    try {
      const supabase = createAdminClient();
      const imgArrayBuffer = await imageFile.arrayBuffer();
      const imgBuffer = Buffer.from(imgArrayBuffer);
      const imgFileName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const imgPath = `announcements/${Date.now()}_${imgFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("published-articles")
        .upload(imgPath, imgBuffer, {
          contentType: imageFile.type || "image/jpeg",
          upsert: true,
          duplex: "half",
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("published-articles")
          .getPublicUrl(imgPath);
        imageUrl = publicUrlData.publicUrl;
      } else {
        console.error("Failed to upload announcement image:", uploadError);
      }
    } catch (err) {
      console.error("Storage upload exception:", err);
    }
  }

  return createAnnouncement({
    title,
    category,
    targetJournal,
    content,
    imageUrl,
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

  let imageUrl: string | undefined = undefined;
  const removeImage = formData.get("removeImage") === "true";
  const imageFile = formData.get("image") as File | null;

  if (removeImage) {
    imageUrl = "";
  } else if (imageFile && imageFile.size > 0) {
    try {
      const supabase = createAdminClient();
      const imgArrayBuffer = await imageFile.arrayBuffer();
      const imgBuffer = Buffer.from(imgArrayBuffer);
      const imgFileName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const imgPath = `announcements/${Date.now()}_${imgFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("published-articles")
        .upload(imgPath, imgBuffer, {
          contentType: imageFile.type || "image/jpeg",
          upsert: true,
          duplex: "half",
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("published-articles")
          .getPublicUrl(imgPath);
        imageUrl = publicUrlData.publicUrl;
      } else {
        console.error("Failed to upload announcement image:", uploadError);
      }
    } catch (err) {
      console.error("Storage upload exception:", err);
    }
  }

  return updateAnnouncement({
    announcementId,
    title,
    category,
    targetJournal,
    content,
    imageUrl,
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
