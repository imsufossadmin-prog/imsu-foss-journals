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
    "Seeding sample submission requests across all active departments...\n",
  );

  // Get active departments & journals
  const journals = await prisma.journal.findMany({
    where: { isActive: true },
    include: { department: true },
  });

  const author = await prisma.user.findFirst({
    where: { email: "author.two@example.com" },
  });

  if (!author) {
    throw new Error(
      "Author two account (author.two@example.com) not found. Run seed-dev-qa-users.ts first.",
    );
  }

  for (const journal of journals) {
    const existing = await prisma.submissionRequest.findFirst({
      where: { journalId: journal.id },
    });

    if (existing) {
      console.log(
        `ℹ️  Journal ${journal.name} (${journal.slug}) already has submission requests.`,
      );
      continue;
    }

    // Create a sample submission request for this department
    const request = await prisma.submissionRequest.create({
      data: {
        departmentId: journal.departmentId,
        journalId: journal.id,
        authorId: author.id,
        status: "NEW",
        messages: {
          create: [
            {
              senderId: author.id,
              kind: "USER",
              body: `Hello Editorial Team, I would like to submit a manuscript titled 'Governance and Institutional Capacity in Modern Public Sector' to ${journal.name}.`,
            },
          ],
        },
      },
    });

    console.log(
      `✅ Created sample request for ${journal.name} (${journal.slug}) -> Request ID: ${request.id}`,
    );
  }

  console.log("\n🎉 Department sample requests seeding complete!");
}

main()
  .catch((error) => {
    console.error(
      "Seeding failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
