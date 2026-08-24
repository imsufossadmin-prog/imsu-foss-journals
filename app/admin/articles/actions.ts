"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireApplicationArea } from "@/lib/auth/authorization";
import { hasJournalRole, isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  deleteArticle,
  publishArticle as setArticlePublishedStatus,
  publishDirectLegacyArticle,
  unpublishArticle,
} from "@/lib/editorial/legacy-mutations";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminArticleFormState = {
  error?: string;
  success?: string;
};

export async function createDirectLegacyArticleAction(
  _prevState: AdminArticleFormState,
  formData: FormData,
): Promise<AdminArticleFormState> {
  const user = await requireApplicationArea("admin");

  const title = (formData.get("title") as string)?.trim();
  const journalSlug = (formData.get("journalSlug") as string)?.trim();
  const volumeStr = formData.get("volume") as string;
  const issueStr = formData.get("issue") as string;
  const yearStr = formData.get("year") as string;
  const pageStart = (formData.get("pageStart") as string)?.trim() || null;
  const pageEnd = (formData.get("pageEnd") as string)?.trim() || null;
  const abstract = (formData.get("abstract") as string)?.trim() || null;
  const keywordsStr = (formData.get("keywords") as string)?.trim();
  const doi = (formData.get("doi") as string)?.trim() || null;
  const authorNamesStr = (formData.get("authorNames") as string)?.trim();

  const manuscriptPdf = formData.get("manuscriptPdf") as File | null;
  const coverImageFile = formData.get("coverImage") as File | null;

  if (!title || !journalSlug || !volumeStr || !issueStr) {
    return {
      error:
        "Please fill in manuscript title, journal, volume, and issue numbers.",
    };
  }

  const targetJournal = await prisma.journal.findUnique({
    where: { slug: journalSlug },
    select: { id: true },
  });

  if (!targetJournal) {
    return { error: "Target journal not found." };
  }

  if (
    !isSuperAdmin(user) &&
    !hasJournalRole(user, targetJournal.id, "JOURNAL_ADMIN")
  ) {
    return {
      error: "You are not authorized to publish content in this department.",
    };
  }

  if (doi) {
    const existingDoi = await prisma.article.findUnique({
      where: { doi },
      select: { id: true, title: true },
    });
    if (existingDoi) {
      return {
        error: `DOI "${doi}" is already assigned to another published article.`,
      };
    }
  }

  if (!manuscriptPdf || manuscriptPdf.size === 0) {
    return { error: "Please select a manuscript PDF file to upload." };
  }

  const volume = Number.parseInt(volumeStr, 10);
  const issue = Number.parseInt(issueStr, 10);
  const year = yearStr
    ? Number.parseInt(yearStr, 10)
    : new Date().getFullYear();

  if (Number.isNaN(volume) || Number.isNaN(issue)) {
    return { error: "Volume and Issue numbers must be valid integers." };
  }

  const keywords = keywordsStr
    ? keywordsStr
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  const authors = authorNamesStr
    ? authorNamesStr
        .split(",")
        .map((name) => ({ fullName: name.trim() }))
        .filter((a) => a.fullName.length > 0)
    : [{ fullName: user.displayName }];

  const supabase = createAdminClient();

  // Upload manuscript PDF to Supabase Storage
  const pdfBytes = await manuscriptPdf.arrayBuffer();
  const pdfFileName = manuscriptPdf.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const pdfPath = `published-legacy/${journalSlug}/${Date.now()}_${pdfFileName}`;

  const { error: pdfUploadError } = await supabase.storage
    .from("published-articles")
    .upload(pdfPath, pdfBytes, {
      contentType: manuscriptPdf.type || "application/pdf",
      upsert: true,
    });

  if (pdfUploadError) {
    return {
      error: `Failed to upload manuscript PDF: ${pdfUploadError.message}`,
    };
  }

  // Upload Cover Image if provided
  let coverImageUrl: string | null = null;
  if (coverImageFile && coverImageFile.size > 0) {
    const imgBytes = await coverImageFile.arrayBuffer();
    const imgFileName = coverImageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const imgPath = `published-covers/${journalSlug}/${Date.now()}_${imgFileName}`;

    const { error: imgError } = await supabase.storage
      .from("published-articles")
      .upload(imgPath, imgBytes, {
        contentType: coverImageFile.type || "image/jpeg",
        upsert: true,
      });

    if (!imgError) {
      const { data: publicUrlData } = supabase.storage
        .from("published-articles")
        .getPublicUrl(imgPath);
      coverImageUrl = publicUrlData.publicUrl;
    }
  }

  try {
    await publishDirectLegacyArticle({
      adminId: user.id,
      journalSlug,
      title,
      abstract,
      keywords,
      volume,
      issue,
      year,
      pageStart,
      pageEnd,
      doi,
      coverImageUrl,
      manuscriptFile: {
        bucket: "published-articles",
        objectPath: pdfPath,
        originalFileName: manuscriptPdf.name,
        sizeBytes: manuscriptPdf.size,
        mimeType: manuscriptPdf.type || "application/pdf",
      },
      authors,
    });
  } catch (err: unknown) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to publish legacy manuscript.",
    };
  }

  revalidatePath("/");
  revalidatePath("/current-issue");
  revalidatePath("/admin/articles");

  redirect("/admin/articles?success=published");
}

export async function toggleArticlePublicationAction(
  articleId: string,
  currentlyPublished: boolean,
) {
  await requireApplicationArea("admin");
  if (currentlyPublished) {
    await unpublishArticle(articleId);
  } else {
    await setArticlePublishedStatus(articleId);
  }
  revalidatePath("/");
  revalidatePath("/current-issue");
  revalidatePath("/admin/articles");
}

export async function deleteArticleAction(articleId: string) {
  await requireApplicationArea("admin");
  await deleteArticle(articleId);
  revalidatePath("/");
  revalidatePath("/current-issue");
  revalidatePath("/admin/articles");
}
