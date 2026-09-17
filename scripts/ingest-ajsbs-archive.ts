import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

// Polyfill WebSocket if missing in Node runtime environment
if (
  typeof (globalThis as unknown as { WebSocket?: unknown }).WebSocket ===
  "undefined"
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (globalThis as unknown as { WebSocket: unknown }).WebSocket = require("ws");
  } catch {
    // ignore if not present
  }
}

// Configuration & Environment
const ARCHIVE_ROOT =
  process.env.AJSBS_ARCHIVE_PATH ||
  "/Users/mac/.gemini/antigravity/scratch/AJSBS_Journals";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ Missing DATABASE_URL in environment.");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error("❌ Missing Supabase credentials in environment.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Types
export interface ParsedIssueFolder {
  folderName: string;
  folderPath: string;
  title: string;
  volume: number;
  issueNumber: number;
  year: number;
  isSpecial: boolean;
}

export interface ArticleMetadataFile {
  url?: string;
  title: string;
  authors: Array<{
    name: string;
    affiliation?: string;
  }>;
  publication_date?: string;
  date_submitted?: string;
  date_created?: string;
  date_modified?: string;
  volume?: string;
  issue?: string;
  abstract?: string;
  keywords?: string[];
  doi?: string;
  pdf_download_url?: string;
  cover_image_url?: string;
}

export interface ParsedArticle {
  order: number;
  pdfFileName: string;
  pdfFilePath: string;
  metadataFilePath: string;
  metadata: ArticleMetadataFile;
  slug: string;
  storagePath: string;
  pubDate: Date;
}

// Helper: Parse folder name into Volume, Issue, Year, Title
export function parseIssueFolderName(folderName: string): ParsedIssueFolder {
  const cleanTitle = folderName.replace(/^\d+_/, "").trim();
  const volMatch = cleanTitle.match(/Vol\.\s*(\d+)/i);
  const noMatch = cleanTitle.match(/No\.\s*(\d+)/i);
  const yearMatch = cleanTitle.match(/\((\d{4})\)/);
  const isSpecial = /special/i.test(cleanTitle);

  const volume = volMatch ? Number.parseInt(volMatch[1], 10) : 16;
  let issueNumber = noMatch ? Number.parseInt(noMatch[1], 10) : 1;
  const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : 2026;

  // Handle Vol. 15 Special Issue without colliding with regular Vol. 15 No. 1
  if (isSpecial && volume === 15 && issueNumber === 1) {
    issueNumber = 11;
  }

  return {
    folderName,
    folderPath: path.join(ARCHIVE_ROOT, folderName),
    title: cleanTitle,
    volume,
    issueNumber,
    year,
    isSpecial,
  };
}

// Helper: Slugify title
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
}

// Helper: Parse publication date
export function parsePublicationDate(
  rawDate: string | undefined,
  defaultYear: number,
): Date {
  if (!rawDate) return new Date(Date.UTC(defaultYear, 0, 1));
  const normalized = String(rawDate).replace(/\//g, "-").trim();
  if (/^\d{4}$/.test(normalized)) {
    return new Date(Date.UTC(Number.parseInt(normalized, 10), 0, 1));
  }
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date(Date.UTC(defaultYear, 0, 1));
}

// Read articles for an issue folder in exact numbered TOC order
export function readArticlesForIssue(
  issue: ParsedIssueFolder,
): ParsedArticle[] {
  const files = fs.readdirSync(issue.folderPath);
  const pdfFiles = files
    .filter((f) => f.endsWith(".pdf"))
    .sort((a, b) => {
      const orderA = Number.parseInt(a.match(/^(\d+)/)?.[1] || "0", 10);
      const orderB = Number.parseInt(b.match(/^(\d+)/)?.[1] || "0", 10);
      return orderA - orderB;
    });

  const articles: ParsedArticle[] = [];

  for (let idx = 0; idx < pdfFiles.length; idx++) {
    const pdfFileName = pdfFiles[idx];
    const orderMatch = pdfFileName.match(/^(\d+)/);
    const order = orderMatch ? Number.parseInt(orderMatch[1], 10) : idx + 1;

    const baseName = pdfFileName.replace(/\.pdf$/, "");
    const metadataFileName = `${baseName}_metadata.json`;
    const metadataFilePath = path.join(issue.folderPath, metadataFileName);

    let metadata: ArticleMetadataFile;
    if (fs.existsSync(metadataFilePath)) {
      metadata = JSON.parse(fs.readFileSync(metadataFilePath, "utf-8"));
    } else {
      metadata = {
        title: baseName.replace(/^\d+\s*-\s*/, "").trim(),
        authors: [{ name: "AJSBS Contributor" }],
        publication_date: `${issue.year}/01/01`,
      };
    }

    const title = (metadata.title || baseName).trim();
    const slugified = slugifyTitle(title) || `article-${order}`;
    const slug = `ajsbs-v${issue.volume}-i${issue.issueNumber}-${order}-${slugified}`;
    const storagePath = `ajsbs/v${issue.volume}-i${issue.issueNumber}/${slug}.pdf`;
    const pubDate = parsePublicationDate(metadata.publication_date, issue.year);

    articles.push({
      order,
      pdfFileName,
      pdfFilePath: path.join(issue.folderPath, pdfFileName),
      metadataFilePath,
      metadata,
      slug,
      storagePath,
      pubDate,
    });
  }

  return articles;
}

// Ingestion Engine Runner
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isAll = args.includes("--all");
  const issueArg = args.find((a) => a.startsWith("--issue="));
  const targetIssueName = issueArg
    ? issueArg.split("=")[1].replace(/^["']|["']$/g, "")
    : null;

  console.log(
    "===============================================================",
  );
  console.log("   IMSU FOSS JOURNALS — AJSBS HISTORICAL INGESTION ENGINE     ");
  console.log(
    "===============================================================\n",
  );
  console.log(`📁 Archive Directory: ${ARCHIVE_ROOT}`);
  console.log(
    `⚙️  Execution Mode:    ${isDryRun ? "DRY-RUN (Validation only, no DB writes)" : isAll ? "ALL ISSUES BATCH INGESTION" : targetIssueName ? `PILOT INGESTION (${targetIssueName})` : "UNSPECIFIED (defaulting to dry-run)"}`,
  );

  if (!fs.existsSync(ARCHIVE_ROOT)) {
    console.error(`❌ Archive directory not found at: ${ARCHIVE_ROOT}`);
    process.exit(1);
  }

  // Scan all folders
  const allEntries = fs.readdirSync(ARCHIVE_ROOT);
  const issueFolders = allEntries
    .filter((entry) => {
      const fullPath = path.join(ARCHIVE_ROOT, entry);
      return (
        fs.statSync(fullPath).isDirectory() &&
        (entry.includes("Vol.") || /^\d+_/.test(entry))
      );
    })
    .sort();

  console.log(
    `📦 Discovered ${issueFolders.length} issue directories in archive.\n`,
  );

  // Filter if target issue specified
  let selectedFolders = issueFolders;
  if (targetIssueName) {
    selectedFolders = issueFolders.filter(
      (f) =>
        f === targetIssueName ||
        f.toLowerCase().includes(targetIssueName.toLowerCase()) ||
        parseIssueFolderName(f).title.toLowerCase() ===
          targetIssueName.toLowerCase(),
    );

    if (selectedFolders.length === 0) {
      console.error(
        `❌ No issue folder matching "${targetIssueName}" was found.`,
      );
      console.log("Available issue folders:");
      for (const f of issueFolders) {
        console.log(`  - ${f}`);
      }
      process.exit(1);
    }
  } else if (!isAll && !isDryRun) {
    console.log("ℹ️  No mode specified. Defaulting to --dry-run.");
  }

  const parsedIssues = selectedFolders.map(parseIssueFolderName);

  // Validation / Dry-Run Phase
  let totalArticlesFound = 0;
  let totalPdfsFound = 0;
  let totalAuthorsCount = 0;
  const globalSlugMap = new Map<string, string>();
  const duplicateSlugs: string[] = [];

  console.log(
    "---------------------------------------------------------------",
  );
  console.log(
    " Issue Index | Volume & Issue            | Articles | Status   ",
  );
  console.log(
    "---------------------------------------------------------------",
  );

  const issueArticleMap = new Map<string, ParsedArticle[]>();

  for (let i = 0; i < parsedIssues.length; i++) {
    const issue = parsedIssues[i];
    const articles = readArticlesForIssue(issue);
    issueArticleMap.set(issue.folderName, articles);

    totalArticlesFound += articles.length;

    for (const art of articles) {
      if (fs.existsSync(art.pdfFilePath)) {
        totalPdfsFound++;
      }
      totalAuthorsCount += (art.metadata.authors || []).length;

      if (globalSlugMap.has(art.slug)) {
        duplicateSlugs.push(art.slug);
      } else {
        globalSlugMap.set(art.slug, `${issue.folderName}/${art.pdfFileName}`);
      }
    }

    const paddedIdx = String(i + 1).padStart(2, " ");
    const paddedTitle = issue.title.padEnd(26, " ").slice(0, 26);
    const paddedCount = String(articles.length).padStart(8, " ");
    console.log(
      ` ${paddedIdx}          | ${paddedTitle} | ${paddedCount} | Verified `,
    );
  }

  console.log(
    "---------------------------------------------------------------",
  );
  console.log(`📊 Summary Statistics:`);
  console.log(`   - Issues Analyzed:     ${parsedIssues.length}`);
  console.log(`   - Total Articles:      ${totalArticlesFound}`);
  console.log(`   - Total PDFs Verified: ${totalPdfsFound}`);
  console.log(`   - Total Authors:       ${totalAuthorsCount}`);
  console.log(`   - Unique Article Slugs:${globalSlugMap.size}`);
  console.log(`   - Slug Collisions:     ${duplicateSlugs.length}`);
  console.log(
    "---------------------------------------------------------------\n",
  );

  if (duplicateSlugs.length > 0) {
    console.error("❌ Validation Failed: Detected duplicate article slugs:");
    for (const s of duplicateSlugs) {
      console.error(`   - ${s}`);
    }
    process.exit(1);
  }

  if (isDryRun || (!isAll && !targetIssueName)) {
    console.log("✅ Dry-run validation completed successfully with 0 errors.");
    console.log(
      "   To execute live pilot ingestion on Volume 16 Issue 6, run:",
    );
    console.log(
      '   npx tsx scripts/ingest-ajsbs-archive.ts --issue="01_Vol. 16 No. 6 (2026)"\n',
    );
    return;
  }

  // Live Database Ingestion Phase
  console.log("🚀 Beginning live database mutations and storage uploads...\n");

  // Ensure AJSBS journal exists
  const journal = await prisma.journal.upsert({
    where: { slug: "ajsbs" },
    update: {
      name: "African Journal of Social and Behavioural Sciences (AJSBS)",
      shortName: "AJSBS",
      description:
        "Official interdisciplinary journal of the Faculty of Social Sciences, Imo State University, publishing cutting-edge peer-reviewed research across social and behavioural sciences.",
      institution: "Imo State University",
      faculty: "Faculty of Social Sciences",
      isActive: true,
    },
    create: {
      slug: "ajsbs",
      name: "African Journal of Social and Behavioural Sciences (AJSBS)",
      shortName: "AJSBS",
      description:
        "Official interdisciplinary journal of the Faculty of Social Sciences, Imo State University, publishing cutting-edge peer-reviewed research across social and behavioural sciences.",
      institution: "Imo State University",
      faculty: "Faculty of Social Sciences",
      isActive: true,
    },
  });

  console.log(
    `✅ Verified canonical journal: ${journal.name} (id: ${journal.id})`,
  );

  // Find admin user for uploaderId
  let adminUser = await prisma.user.findFirst({
    where: { globalRoles: { some: { role: "SUPER_ADMIN" } } },
    select: { id: true, displayName: true },
  });

  if (!adminUser) {
    adminUser = await prisma.user.findFirst({
      where: { isActive: true },
      select: { id: true, displayName: true },
    });
  }

  if (!adminUser) {
    console.error("❌ No valid user found in database for uploaderId.");
    process.exit(1);
  }

  console.log(
    `👤 Using uploader identity: ${adminUser.displayName} (${adminUser.id})\n`,
  );

  let processedIssues = 0;
  let processedArticles = 0;
  let uploadedPdfs = 0;
  const startTime = Date.now();

  for (let issueIdx = 0; issueIdx < parsedIssues.length; issueIdx++) {
    const issue = parsedIssues[issueIdx];
    console.log(
      `▶️  [${issueIdx + 1}/${parsedIssues.length}] Processing: ${issue.title} (Vol ${issue.volume}, No ${issue.issueNumber}, Year ${issue.year})`,
    );

    // Handle Issue Cover Image if present
    let coverImageUrl: string | null = null;
    const coverPath = path.join(issue.folderPath, "Issue_Cover.jpg");
    if (fs.existsSync(coverPath)) {
      const coverBuffer = fs.readFileSync(coverPath);
      const coverStoragePath = `published-covers/ajsbs/v${issue.volume}-i${issue.issueNumber}/cover.jpg`;
      const { error: coverUploadError } = await supabase.storage
        .from("published-articles")
        .upload(coverStoragePath, coverBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (!coverUploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("published-articles")
          .getPublicUrl(coverStoragePath);
        coverImageUrl = publicUrlData.publicUrl;
      }
    }

    // Upsert Volume
    const volumeRecord = await prisma.volume.upsert({
      where: {
        journalId_year_number: {
          journalId: journal.id,
          year: issue.year,
          number: issue.volume,
        },
      },
      update: {
        title: `Volume ${issue.volume} (${issue.year})`,
      },
      create: {
        journalId: journal.id,
        number: issue.volume,
        year: issue.year,
        title: `Volume ${issue.volume} (${issue.year})`,
      },
    });

    // Derive issue publication date from first article or default
    const articles = issueArticleMap.get(issue.folderName) || [];
    const issuePubDate =
      articles[0]?.pubDate || new Date(Date.UTC(issue.year, 0, 1));

    // Upsert Issue
    const issueRecord = await prisma.issue.upsert({
      where: {
        volumeId_number: {
          volumeId: volumeRecord.id,
          number: issue.issueNumber,
        },
      },
      update: {
        title: issue.title,
        isPublished: true,
        publishedAt: issuePubDate,
      },
      create: {
        volumeId: volumeRecord.id,
        number: issue.issueNumber,
        title: issue.title,
        isPublished: true,
        publishedAt: issuePubDate,
      },
    });

    // Process articles
    for (let artIdx = 0; artIdx < articles.length; artIdx++) {
      const art = articles[artIdx];
      const fileBuffer = fs.readFileSync(art.pdfFilePath);
      const fileStat = fs.statSync(art.pdfFilePath);

      // Upload PDF to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("published-articles")
        .upload(art.storagePath, fileBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.warn(
          `   ⚠️ Supabase PDF upload warning for ${art.slug}: ${uploadError.message}`,
        );
      } else {
        uploadedPdfs++;
      }

      // Upsert StoredFile
      const storedFile = await prisma.storedFile.upsert({
        where: {
          bucket_objectPath: {
            bucket: "published-articles",
            objectPath: art.storagePath,
          },
        },
        update: {
          sizeBytes: BigInt(fileStat.size),
          mimeType: "application/pdf",
          originalFileName: art.pdfFileName,
        },
        create: {
          bucket: "published-articles",
          objectPath: art.storagePath,
          originalFileName: art.pdfFileName,
          mimeType: "application/pdf",
          sizeBytes: BigInt(fileStat.size),
          uploaderId: adminUser.id,
        },
      });

      // Filter and sanitize keywords
      const keywords = (art.metadata.keywords || [])
        .map((k) => k.trim())
        .filter((k) => k.length > 0 && k.toLowerCase() !== "none");

      const doi = art.metadata.doi?.trim() || null;

      // Upsert Article
      const articleRecord = await prisma.article.upsert({
        where: { slug: art.slug },
        update: {
          issueId: issueRecord.id,
          title: art.metadata.title.trim(),
          abstract: art.metadata.abstract?.trim() || null,
          keywords,
          doi,
          issueOrder: art.order,
          isPublished: true,
          publishedAt: art.pubDate,
          coverImageUrl: coverImageUrl || art.metadata.cover_image_url || null,
        },
        create: {
          issueId: issueRecord.id,
          title: art.metadata.title.trim(),
          slug: art.slug,
          abstract: art.metadata.abstract?.trim() || null,
          keywords,
          doi,
          issueOrder: art.order,
          isPublished: true,
          publishedAt: art.pubDate,
          coverImageUrl: coverImageUrl || art.metadata.cover_image_url || null,
        },
      });

      // Synchronize Authors
      const rawAuthors =
        art.metadata.authors && art.metadata.authors.length > 0
          ? art.metadata.authors
          : [{ name: "AJSBS Contributor", affiliation: "" }];

      await prisma.articleAuthor.deleteMany({
        where: { articleId: articleRecord.id },
      });

      await prisma.articleAuthor.createMany({
        data: rawAuthors.map((a, idx) => ({
          articleId: articleRecord.id,
          fullName: a.name.trim() || "AJSBS Contributor",
          affiliation: a.affiliation?.trim() || null,
          position: idx + 1,
        })),
      });

      // Link ArticleFile
      await prisma.articleFile.upsert({
        where: { storedFileId: storedFile.id },
        update: {
          articleId: articleRecord.id,
          type: "PUBLISHED_PDF",
        },
        create: {
          articleId: articleRecord.id,
          storedFileId: storedFile.id,
          type: "PUBLISHED_PDF",
        },
      });

      processedArticles++;
      console.log(
        `   [${artIdx + 1}/${articles.length}] Ingested: ${art.slug}`,
      );
    }

    processedIssues++;
    console.log(
      `   ✅ Finished Issue ${issue.title} (${articles.length} articles)\n`,
    );
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    "===============================================================",
  );
  console.log(
    "   INGESTION BATCH COMPLETE                                    ",
  );
  console.log(
    "===============================================================",
  );
  console.log(`✨ Issues Ingested:    ${processedIssues}`);
  console.log(`📄 Articles Ingested:  ${processedArticles}`);
  console.log(`☁️  PDFs Uploaded:      ${uploadedPdfs}`);
  console.log(`⏱️  Duration:           ${durationSec}s`);
  console.log(
    "===============================================================\n",
  );
}

main()
  .catch((err) => {
    console.error("❌ Ingestion process error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
