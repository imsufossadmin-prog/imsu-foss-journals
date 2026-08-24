import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { GlobalRole, JournalRole, PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const databaseUrl = required("DATABASE_URL");
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const secretKey = required("SUPABASE_SECRET_KEY");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

(globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
  class {} as unknown as typeof WebSocket;
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getOrCreateAuthUser(email: string, password: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (data?.user) return data.user.id;

  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });

  if (listError) throw listError;

  const match = listData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  if (!match)
    throw error || new Error(`Could not create or find user: ${email}`);

  await supabase.auth.admin.updateUserById(match.id, {
    password,
    email_confirm: true,
  });

  return match.id;
}

async function ensureJournalExists(
  slug: string,
  name: string,
  shortName: string,
) {
  const existing = await prisma.journal.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing) return existing.id;

  const dept = await prisma.department.upsert({
    where: { slug },
    update: { name, isActive: true },
    create: { name, slug, description: `${name} Department`, isActive: true },
  });

  const journal = await prisma.journal.upsert({
    where: { slug },
    update: { name: `${name} Journal Operations`, shortName, isActive: true },
    create: {
      slug,
      departmentId: dept.id,
      name: `${name} Journal Operations`,
      shortName,
      description: `Academic journal operations for ${name}.`,
      institution: "Imo State University",
      faculty: "Faculty of Social Sciences",
      isActive: true,
    },
  });

  return journal.id;
}

async function provisionAccount(input: {
  email: string;
  password: string;
  displayName: string;
  role: GlobalRole | JournalRole;
  journalSlug?: string;
  journalName?: string;
  journalShortName?: string;
}) {
  const isGlobalRole = Object.values(GlobalRole).includes(
    input.role as GlobalRole,
  );
  let journalId: string | null = null;

  if (!isGlobalRole) {
    if (!input.journalSlug)
      throw new Error("journalSlug required for journal roles.");
    journalId = await ensureJournalExists(
      input.journalSlug,
      input.journalName || input.journalSlug,
      input.journalShortName || input.journalSlug.toUpperCase(),
    );
  }

  const authUserId = await getOrCreateAuthUser(input.email, input.password);

  await prisma.user.upsert({
    where: { id: authUserId },
    update: {
      email: input.email,
      displayName: input.displayName,
      isActive: true,
    },
    create: {
      id: authUserId,
      email: input.email,
      displayName: input.displayName,
    },
  });

  await prisma.userGlobalRole.upsert({
    where: { userId_role: { userId: authUserId, role: GlobalRole.AUTHOR } },
    update: {},
    create: { userId: authUserId, role: GlobalRole.AUTHOR },
  });

  if (isGlobalRole) {
    if (input.role !== GlobalRole.AUTHOR) {
      await prisma.userGlobalRole.upsert({
        where: {
          userId_role: { userId: authUserId, role: input.role as GlobalRole },
        },
        update: {},
        create: { userId: authUserId, role: input.role as GlobalRole },
      });
    }
  } else {
    await prisma.journalRoleAssignment.upsert({
      where: {
        userId_journalId_role: {
          userId: authUserId,
          journalId: journalId!,
          role: input.role as JournalRole,
        },
      },
      update: {},
      create: {
        userId: authUserId,
        journalId: journalId!,
        role: input.role as JournalRole,
      },
    });
  }

  return authUserId;
}

async function resetSuperAdminAndProvision() {
  console.log("Cleaning up old super.admin@example.com test account...");

  // Find super.admin@example.com if present
  const oldSuperAdmin = await prisma.user.findFirst({
    where: { email: "super.admin@example.com" },
  });

  if (oldSuperAdmin) {
    await prisma.userGlobalRole.deleteMany({
      where: { userId: oldSuperAdmin.id },
    });
    await prisma.journalRoleAssignment.deleteMany({
      where: { userId: oldSuperAdmin.id },
    });
    await prisma.user.delete({ where: { id: oldSuperAdmin.id } });
    console.log("🗑️  Deleted old super.admin@example.com test user.");
  }

  // Ensure imsufossadmin@gmail.com has SUPER_ADMIN role in database
  const realSuperAdmin = await prisma.user.findFirst({
    where: { email: "imsufossadmin@gmail.com" },
  });

  if (realSuperAdmin) {
    await prisma.userGlobalRole.upsert({
      where: {
        userId_role: {
          userId: realSuperAdmin.id,
          role: GlobalRole.SUPER_ADMIN,
        },
      },
      update: {},
      create: { userId: realSuperAdmin.id, role: GlobalRole.SUPER_ADMIN },
    });
    console.log(
      "👑 Granted SUPER_ADMIN global role to imsufossadmin@gmail.com.",
    );
  }
}

const accounts = [
  {
    email: "author.one@example.com",
    displayName: "Dr. Author One",
    role: "AUTHOR" as GlobalRole,
  },
  {
    email: "editor.psych1@example.com",
    displayName: "Dr. Psychology Editor One",
    role: "EDITOR" as JournalRole,
    journalSlug: "psychology",
    journalName: "Psychology",
    journalShortName: "PSY",
  },
  {
    email: "editor.psych2@example.com",
    displayName: "Dr. Psychology Editor Two",
    role: "EDITOR" as JournalRole,
    journalSlug: "psychology",
    journalName: "Psychology",
    journalShortName: "PSY",
  },
];

const password = "DevPass2026!";

async function main() {
  console.log(
    "Seeding QA test accounts into Supabase & Postgres database...\n",
  );

  await resetSuperAdminAndProvision();

  for (const account of accounts) {
    process.stdout.write(`Provisioning ${account.email}... `);
    await provisionAccount({
      email: account.email,
      password,
      displayName: account.displayName,
      role: account.role,
      journalSlug: account.journalSlug,
      journalName: account.journalName,
      journalShortName: account.journalShortName,
    });
    console.log("✅ Done");
  }

  console.log("\n🎉 Account seeding complete!");
  console.log("🔑 Primary Super Admin: imsufossadmin@gmail.com");
  console.log(`🔑 Test Author: author.one@example.com (Password: ${password})`);
  console.log(
    `🔑 Psychology Editor 1: editor.psych1@example.com (Password: ${password})`,
  );
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
