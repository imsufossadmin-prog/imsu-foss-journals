import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(
    "Cleaning up old test submission requests and test draft submissions...",
  );

  await prisma.conversationAttachment.deleteMany({});
  await prisma.submissionConversationMessage.deleteMany({});
  await prisma.editorialDecision.deleteMany({});
  await prisma.submissionEvent.deleteMany({});
  await prisma.adherenceReport.deleteMany({});
  await prisma.reviewAttachment.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.reviewAssignment.deleteMany({});
  await prisma.reviewRound.deleteMany({});
  await prisma.submissionVersion.deleteMany({});
  await prisma.submissionFile.deleteMany({});
  await prisma.submissionAuthor.deleteMany({});
  await prisma.submissionRequest.deleteMany({});
  await prisma.submission.deleteMany({});

  const publishedArticlesCount = await prisma.article.count({
    where: { isPublished: true },
  });

  console.log(
    `✅ Test submission requests and submissions cleared. All ${publishedArticlesCount} published articles preserved in catalog.`,
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
