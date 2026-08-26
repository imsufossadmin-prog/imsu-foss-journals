import { prisma } from "@/lib/db/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

export type DirectLegacyArticleInput = {
  adminId: string;
  journalSlug: string;
  title: string;
  abstract?: string | null;
  keywords?: string[];
  volume: number;
  issue: number;
  year?: number;
  pageStart?: string | null;
  pageEnd?: string | null;
  doi?: string | null;
  coverImageUrl?: string | null;
  manuscriptFile: {
    bucket: string;
    objectPath: string;
    originalFileName: string;
    sizeBytes: number;
    mimeType: string;
  };
  authors: Array<{
    fullName: string;
    email?: string | null;
    affiliation?: string | null;
  }>;
};

export async function publishDirectLegacyArticle(
  input: DirectLegacyArticleInput,
) {
  const journal = await prisma.journal.findUnique({
    where: { slug: input.journalSlug },
  });

  if (!journal) {
    throw new Error("Target journal not found.");
  }

  const pubYear = input.year ?? new Date().getFullYear();

  // Atomic Volume upsert
  const volume = await prisma.volume.upsert({
    where: {
      journalId_year_number: {
        journalId: journal.id,
        year: pubYear,
        number: input.volume,
      },
    },
    update: {},
    create: {
      journalId: journal.id,
      number: input.volume,
      year: pubYear,
    },
  });

  // Atomic Issue upsert
  const issue = await prisma.issue.upsert({
    where: {
      volumeId_number: {
        volumeId: volume.id,
        number: input.issue,
      },
    },
    update: {},
    create: {
      volumeId: volume.id,
      number: input.issue,
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  const baseSlug =
    input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "article";

  const slug = `art-${baseSlug}-${Date.now().toString(36)}`;

  const storedFile = await prisma.storedFile.create({
    data: {
      bucket: input.manuscriptFile.bucket,
      objectPath: input.manuscriptFile.objectPath,
      originalFileName: input.manuscriptFile.originalFileName,
      mimeType: input.manuscriptFile.mimeType,
      sizeBytes: BigInt(input.manuscriptFile.sizeBytes),
      uploaderId: input.adminId,
    },
  });

  const article = await prisma.article.create({
    data: {
      issueId: issue.id,
      title: input.title,
      slug,
      abstract: input.abstract,
      keywords: input.keywords ?? [],
      doi: input.doi || null,
      pageStart: input.pageStart,
      pageEnd: input.pageEnd,
      coverImageUrl: input.coverImageUrl,
      isPublished: true,
      publishedAt: new Date(),
      authors: {
        create: input.authors.map((author, index) => ({
          position: index + 1,
          fullName: author.fullName,
          email: author.email || null,
          affiliation: author.affiliation || null,
        })),
      },
      files: {
        create: {
          storedFileId: storedFile.id,
          type: "PUBLISHED_PDF",
        },
      },
    },
    include: {
      authors: true,
      issue: {
        include: {
          volume: {
            include: {
              journal: true,
            },
          },
        },
      },
    },
  });

  return article;
}

function articleScope(articleId: string, journalIds: string[] | null) {
  return {
    id: articleId,
    ...(journalIds
      ? { issue: { volume: { journalId: { in: journalIds } } } }
      : {}),
  };
}

export async function unpublishArticle(
  articleId: string,
  journalIds: string[] | null,
) {
  return prisma.article.updateMany({
    where: articleScope(articleId, journalIds),
    data: { isPublished: false },
  });
}

export async function publishArticle(
  articleId: string,
  journalIds: string[] | null,
) {
  return prisma.article.updateMany({
    where: articleScope(articleId, journalIds),
    data: { isPublished: true, publishedAt: new Date() },
  });
}

export async function deleteArticle(
  articleId: string,
  journalIds: string[] | null,
) {
  const article = await prisma.article.findFirst({
    where: articleScope(articleId, journalIds),
    include: {
      files: { include: { storedFile: true } },
    },
  });

  if (!article) throw new Error("Article unavailable.");

  if (article.files.length > 0) {
    const supabase = createAdminClient();
    const byBucket = new Map<string, Array<{ objectPath: string }>>();
    for (const { storedFile } of article.files) {
      const files = byBucket.get(storedFile.bucket) ?? [];
      files.push({ objectPath: storedFile.objectPath });
      byBucket.set(storedFile.bucket, files);
    }
    for (const [bucket, files] of byBucket) {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(files.map(({ objectPath }) => objectPath));
      if (error) {
        throw new Error("Article files could not be removed.");
      }
    }
  }

  const storedFileIds = article.files.map(({ storedFileId }) => storedFileId);
  return prisma.$transaction([
    prisma.article.delete({ where: { id: article.id } }),
    prisma.storedFile.deleteMany({ where: { id: { in: storedFileIds } } }),
  ]);
}
