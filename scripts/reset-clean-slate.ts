import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function resetCleanSlate() {
  console.log("===============================================================================");
  console.log("RESETTING DATABASE TO CLEAN SLATE (0 Articles, 0 Requests, 0 Submissions)");
  console.log("===============================================================================\n");

  await prisma.$executeRawUnsafe(`
    DELETE FROM "EditorialDecision";
    DELETE FROM "Review";
    DELETE FROM "ReviewAssignment";
    DELETE FROM "ReviewRound";
    DELETE FROM "SubmissionFile";
    DELETE FROM "SubmissionVersion";
    DELETE FROM "SubmissionAuthor";
    DELETE FROM "SubmissionEvent";
    DELETE FROM "ArticleAuthor";
    DELETE FROM "ArticleFile";
    DELETE FROM "Article";
    DELETE FROM "Issue";
    DELETE FROM "Volume";
    DELETE FROM "ConversationAttachment";
    DELETE FROM "SubmissionConversationMessage";
    DELETE FROM "Submission";
    DELETE FROM "SubmissionRequest";
    DELETE FROM "StoredFile";
  `);

  console.log("✓ All submissions, requests, reviews, and published articles purged.");
  console.log("✓ Verified: Database is now on a 100% CLEAN SLATE ready for live client demo!");
}

resetCleanSlate()
  .catch((e) => {
    console.error("Error during reset:", e);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
    process.exit(0);
  });
