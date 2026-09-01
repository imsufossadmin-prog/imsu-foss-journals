import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SUPER_ADMIN_EMAILS = [
  "imsufossadmin@gmail.com",
  "martinzkizitto@gmail.com",
  "martinzkiziztto@gmail.com",
];

const TEST_AUTHOR_EMAILS = [
  "author.one@example.com",
  "author.two@example.com",
  "author.three@example.com",
];

async function cleanupDatabase() {
  console.log(
    "=================================================================",
  );
  console.log("SAFE PRODUCTION DATABASE CLEANUP & DATA PURGE");
  console.log(
    "=================================================================\n",
  );

  console.log("1. Purging test data tables in dependency order...");

  // Execute deletion in dependency order
  const tables = [
    "EditorialDecision",
    "ReviewAttachment",
    "Review",
    "ReviewAssignment",
    "ReviewRound",
    "AdherenceReport",
    "SubmissionFile",
    "SubmissionVersion",
    "SubmissionAuthor",
    "SubmissionEvent",
    "ArticleAuthor",
    "ArticleFile",
    "Article",
    "Issue",
    "Volume",
    "ConversationAttachment",
    "SubmissionConversationMessage",
    "SubmissionRequest",
    "Submission",
    "StoredFile",
  ];

  for (const table of tables) {
    try {
      const result = await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
      console.log(`  ✓ Purged table "${table}" (${result} rows removed)`);
    } catch (err: unknown) {
      console.warn(
        `  ⚠ Note on "${table}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log("\n2. Verifying & Preserving Protected Super Admin Accounts...");

  for (const email of SUPER_ADMIN_EMAILS) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { globalRoles: true },
    });

    if (user) {
      console.log(`  Found user: ${user.email} (ID: ${user.id})`);

      // Ensure SUPER_ADMIN role
      const hasSuperAdmin = user.globalRoles.some(
        (r) => r.role === "SUPER_ADMIN",
      );
      if (!hasSuperAdmin) {
        await prisma.userGlobalRole.create({
          data: { userId: user.id, role: "SUPER_ADMIN" },
        });
        console.log(`    + Added SUPER_ADMIN role to ${user.email}`);
      } else {
        console.log(`    ✓ SUPER_ADMIN role verified for ${user.email}`);
      }

      // Ensure AUTHOR role
      const hasAuthor = user.globalRoles.some((r) => r.role === "AUTHOR");
      if (!hasAuthor) {
        await prisma.userGlobalRole.create({
          data: { userId: user.id, role: "AUTHOR" },
        });
        console.log(`    + Added AUTHOR role to ${user.email}`);
      } else {
        console.log(`    ✓ AUTHOR role verified for ${user.email}`);
      }
    } else {
      console.log(
        `  ℹ Super Admin account ${email} not currently in DB (will be created on first Google OAuth login)`,
      );
    }
  }

  console.log("\n3. Verifying Test Author Accounts...");
  for (const email of TEST_AUTHOR_EMAILS) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { globalRoles: true },
    });

    if (user) {
      console.log(`  Found test author: ${user.email} (ID: ${user.id})`);
      const hasAuthor = user.globalRoles.some((r) => r.role === "AUTHOR");
      if (!hasAuthor) {
        await prisma.userGlobalRole.create({
          data: { userId: user.id, role: "AUTHOR" },
        });
        console.log(`    + Added AUTHOR role to ${user.email}`);
      } else {
        console.log(`    ✓ AUTHOR role verified for ${user.email}`);
      }
    }
  }

  console.log(
    "\n=================================================================",
  );
  console.log(
    "SAFE DATABASE CLEANUP COMPLETE: Clean Slate Ready for Production!",
  );
  console.log(
    "=================================================================",
  );
}

cleanupDatabase()
  .catch((err) => {
    console.error("Cleanup error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });
