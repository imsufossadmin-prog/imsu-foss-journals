import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const databaseUrl = required("DATABASE_URL");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  console.log(
    "Cleaning all submission request and manuscript data from database...\n",
  );

  await prisma.conversationAttachment.deleteMany({});
  console.log("✓ Deleted all conversation attachments");

  await prisma.submissionConversationMessage.deleteMany({});
  console.log("✓ Deleted all conversation messages");

  await prisma.review.deleteMany({});
  console.log("✓ Deleted all reviews");

  await prisma.editorialDecision.deleteMany({});
  console.log("✓ Deleted all editorial decisions");

  await prisma.reviewAssignment.deleteMany({});
  console.log("✓ Deleted all review assignments");

  await prisma.reviewRound.deleteMany({});
  console.log("✓ Deleted all review rounds");

  await prisma.submissionEvent.deleteMany({});
  console.log("✓ Deleted all submission events");

  await prisma.submissionVersion.deleteMany({});
  console.log("✓ Deleted all submission versions");

  await prisma.submissionFile.deleteMany({});
  console.log("✓ Deleted all submission files");

  await prisma.submissionAuthor.deleteMany({});
  console.log("✓ Deleted all submission authors");

  await prisma.submissionRequest.updateMany({
    data: { submissionId: null },
  });

  await prisma.submission.deleteMany({});
  console.log("✓ Deleted all submissions");

  await prisma.submissionRequest.deleteMany({});
  console.log("✓ Deleted all submission requests");

  console.log("\n🎉 Database cleanup complete! 0 submission requests remain.");
}

main()
  .catch((error) => {
    console.error(
      "Cleanup failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
