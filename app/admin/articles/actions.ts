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
import {
  closeIssue,
  reopenIssue,
  publishIssueTOC,
} from "@/lib/editorial/issue-mutations";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminArticleFormState = {
  error?: string;
  success?: string;
};

function manageableJournalIds(
  user: Awaited<ReturnType<typeof requireApplicationArea>>,
) {
  if (isSuperAdmin(user)) return null;
  return user.journalRoles
    .filter(
      ({ role, journal }) =>
        role === "JOURNAL_ADMIN" &&
        journal.isActive &&
        (!journal.department || journal.department.isActive),
    )
    .map(({ journalId }) => journalId);
}

function assertChanged(result: { count: number }) {
  if (result.count !== 1) throw new Error("Article unavailable.");
}

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
  const issueOrderStr = (formData.get("issueOrder") as string)?.trim();
  const publishedAtStr = (formData.get("publishedAt") as string)?.trim();
  const pageStart = (formData.get("pageStart") as string)?.trim() || null;
  const pageEnd = (formData.get("pageEnd") as string)?.trim() || null;
  const abstract = (formData.get("abstract") as string)?.trim() || null;
  const keywordsStr = (formData.get("keywords") as string)?.trim();
  const doi = (formData.get("doi") as string)?.trim() || null;
  const authorNamesStr = (formData.get("authorNames") as string)?.trim();

  const manuscriptPdf = formData.get("manuscriptPdf") as File | null;
  const coverImageFile = formData.get("coverImage") as File | null;

  let publishedAt: Date | undefined = undefined;
  if (publishedAtStr) {
    const parsedDate = new Date(publishedAtStr);
    if (!Number.isNaN(parsedDate.getTime())) {
      publishedAt = parsedDate;
    }
  }

  let issueOrder: number | undefined = undefined;
  if (issueOrderStr) {
    const parsedOrder = Number.parseInt(issueOrderStr, 10);
    if (!Number.isNaN(parsedOrder) && parsedOrder > 0) {
      issueOrder = parsedOrder;
    }
  }

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
      error: "You are not authorized to publish content in this journal.",
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

  let pdfPath = "";
  let coverImagePath = "";
  let coverImageUrl: string | null = null;

  try {
    // Upload manuscript PDF to Supabase Storage
    const pdfArrayBuffer = await manuscriptPdf.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    const pdfFileName = manuscriptPdf.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    pdfPath = `published-legacy/${journalSlug}/${Date.now()}_${pdfFileName}`;

    const { error: pdfUploadError } = await supabase.storage
      .from("published-articles")
      .upload(pdfPath, pdfBuffer, {
        contentType: manuscriptPdf.type || "application/pdf",
        upsert: true,
        duplex: "half",
      });

    if (pdfUploadError) {
      return {
        error: `Failed to upload manuscript PDF: ${pdfUploadError.message}`,
      };
    }

    // Upload Cover Image if provided
    if (coverImageFile && coverImageFile.size > 0) {
      const imgArrayBuffer = await coverImageFile.arrayBuffer();
      const imgBuffer = Buffer.from(imgArrayBuffer);
      const imgFileName = coverImageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const imgPath = `published-covers/${journalSlug}/${Date.now()}_${imgFileName}`;

      const { error: imgError } = await supabase.storage
        .from("published-articles")
        .upload(imgPath, imgBuffer, {
          contentType: coverImageFile.type || "image/jpeg",
          upsert: true,
          duplex: "half",
        });

      if (!imgError) {
        coverImagePath = imgPath;
        const { data: publicUrlData } = supabase.storage
          .from("published-articles")
          .getPublicUrl(imgPath);
        coverImageUrl = publicUrlData.publicUrl;
      }
    }
  } catch (err: unknown) {
    return {
      error: `Storage upload error: ${err instanceof Error ? err.message : String(err)}`,
    };
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
      publishedAt,
      issueOrder,
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
    const uploadedPaths = [pdfPath, coverImagePath].filter(Boolean);
    if (uploadedPaths.length > 0) {
      const { error } = await supabase.storage
        .from("published-articles")
        .remove(uploadedPaths);
      if (error) console.error("Legacy upload cleanup failed:", error.message);
    }
    let message = "Failed to publish legacy manuscript. Please try again.";
    if (err instanceof Error) {
      if (
        err.message.includes("Unique constraint failed") ||
        err.message.includes("invocation")
      ) {
        message =
          "A unique record conflict was encountered. Please check the volume, issue, or DOI.";
      } else if (
        !err.message.includes("\n") &&
        !err.message.includes("PrismaClient") &&
        !err.message.includes("/")
      ) {
        message = err.message;
      }
    }
    return { error: message };
  }

  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/current-issue");
  revalidatePath("/archives");

  redirect("/admin/articles?success=published");
}

export async function toggleArticlePublicationAction(
  articleId: string,
  currentlyPublished: boolean,
) {
  const user = await requireApplicationArea("admin");
  const journalIds = manageableJournalIds(user);
  if (currentlyPublished) {
    assertChanged(await unpublishArticle(articleId, journalIds));
  } else {
    assertChanged(await setArticlePublishedStatus(articleId, journalIds));
  }
  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/current-issue");
  revalidatePath("/archives");
}

export async function deleteArticleAction(articleId: string) {
  const user = await requireApplicationArea("admin");
  await deleteArticle(articleId, manageableJournalIds(user));
  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/current-issue");
  revalidatePath("/archives");
}

export async function closeIssueAdminAction(issueId: string) {
  const user = await requireApplicationArea("admin");
  await closeIssue({
    adminId: user.id,
    issueId,
  });
  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/current-issue");
  revalidatePath("/archives");
}

export async function reopenIssueAdminAction(issueId: string) {
  const user = await requireApplicationArea("admin");
  await reopenIssue({
    adminId: user.id,
    issueId,
  });
  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/current-issue");
  revalidatePath("/archives");
}

export async function publishIssueTOCAdminAction(issueId: string) {
  const user = await requireApplicationArea("admin");
  await publishIssueTOC({
    adminId: user.id,
    issueId,
  });
  revalidatePath("/admin/articles");
  revalidatePath("/");
  revalidatePath("/current-issue");
  revalidatePath("/archives");
}
