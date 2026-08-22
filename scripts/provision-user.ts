import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { GlobalRole, JournalRole, PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

import { provisionDevelopmentUser } from "../lib/auth/development-provisioning";

function required(name: string) {
  const value = process.env[name]?.trim();

  if (!value) throw new Error(`${name} is required.`);

  return value;
}

const email = required("DEV_USER_EMAIL").toLowerCase();
const password = required("DEV_USER_PASSWORD");
const displayName = required("DEV_USER_DISPLAY_NAME");
const role = required("DEV_USER_ROLE");
const journalSlug = process.env.DEV_USER_JOURNAL_SLUG?.trim();
const databaseUrl = required("DATABASE_URL");
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const secretKey = required("SUPABASE_SECRET_KEY");

if (password.length < 12) {
  throw new Error("DEV_USER_PASSWORD must contain at least 12 characters.");
}

const globalRoles = Object.values(GlobalRole) as string[];
const journalRoles = Object.values(JournalRole) as string[];

if (!globalRoles.includes(role) && !journalRoles.includes(role)) {
  throw new Error(`DEV_USER_ROLE is not supported: ${role}`);
}

if (journalRoles.includes(role) && !journalSlug) {
  throw new Error(
    "DEV_USER_JOURNAL_SLUG is required for journal-scoped roles.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const authStore = {
  async findUserIdByEmail(candidateEmail: string) {
    for (let page = 1; ; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 100,
      });

      if (error) throw error;

      const match = data.users.find(
        (user) => user.email?.toLowerCase() === candidateEmail,
      );
      if (match) return match.id;
      if (data.users.length < 100) return null;
    }
  },
  async createUser(candidateEmail: string, candidatePassword: string) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: candidateEmail,
      password: candidatePassword,
      email_confirm: true,
    });
    if (error) throw error;
    return data.user.id;
  },
  async updateUser(userId: string, candidatePassword: string) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: candidatePassword,
      email_confirm: true,
    });
    if (error) throw error;
  },
};

const applicationStore = {
  async findJournalIdBySlug(slug: string) {
    const journal = await prisma.journal.findUnique({
      where: { slug },
      select: { id: true },
    });
    return journal?.id ?? null;
  },
  async upsertUser(input: { id: string; email: string; displayName: string }) {
    await prisma.user.upsert({
      where: { id: input.id },
      update: {
        email: input.email,
        displayName: input.displayName,
        isActive: true,
      },
      create: input,
    });
  },
  async ensureGlobalRole(userId: string, candidateRole: GlobalRole) {
    await prisma.userGlobalRole.upsert({
      where: { userId_role: { userId, role: candidateRole } },
      update: {},
      create: { userId, role: candidateRole },
    });
  },
  async ensureJournalRole(
    userId: string,
    journalId: string,
    candidateRole: JournalRole,
  ) {
    await prisma.journalRoleAssignment.upsert({
      where: {
        userId_journalId_role: {
          userId,
          journalId,
          role: candidateRole,
        },
      },
      update: {},
      create: { userId, journalId, role: candidateRole },
    });
  },
};

async function main() {
  await provisionDevelopmentUser(
    {
      email,
      password,
      displayName,
      role: role as GlobalRole | JournalRole,
      journalSlug,
    },
    { auth: authStore, application: applicationStore },
  );

  console.log(`Provisioned ${email} with role ${role}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
