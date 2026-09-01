import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SUPER_ADMINS = [
  { email: "imsufossadmin@gmail.com", name: "IMSU FOSS Admin" },
  { email: "martinzkiziztto@gmail.com", name: "Martinz Kizito" },
  { email: "martinzkizitto@gmail.com", name: "Martinz Kizito" },
];

async function syncSuperAdmins() {
  console.log("Syncing Super Admin accounts in database...");

  for (const { email, name } of SUPER_ADMINS) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { globalRoles: true },
    });

    if (user) {
      console.log(`Found existing user for ${email} (ID: ${user.id})`);

      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true },
      });

      await prisma.userGlobalRole.upsert({
        where: { userId_role: { userId: user.id, role: "AUTHOR" } },
        update: {},
        create: { userId: user.id, role: "AUTHOR" },
      });

      await prisma.userGlobalRole.upsert({
        where: { userId_role: { userId: user.id, role: "SUPER_ADMIN" } },
        update: {},
        create: { userId: user.id, role: "SUPER_ADMIN" },
      });

      console.log(`✓ Verified SUPER_ADMIN + AUTHOR roles for ${email}`);
    } else {
      console.log(
        `ℹ Account ${email} not yet in User table. It will auto-provision with SUPER_ADMIN on first login via getCurrentUser self-healing.`,
      );
    }
  }

  console.log("Super admin sync completed.");
}

syncSuperAdmins()
  .catch((e) => {
    console.error("Error during sync:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });
