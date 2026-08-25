import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { GlobalRole, JournalRole, PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

import { provisionDevelopmentUser } from "../lib/auth/development-provisioning";

const databaseUrl = process.env.DATABASE_URL!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const authStore = {
  async findUserIdByEmail(candidateEmail: string) {
    const user = await prisma.user.findUnique({
      where: { email: candidateEmail },
      select: { id: true },
    });
    return user?.id ?? null;
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

const USERS_TO_PROVISION = [
  {
    email: "superadmin@example.com",
    password: "password123456",
    displayName: "Super Administrator",
    role: "SUPER_ADMIN" as const,
  },
  {
    email: "admin@example.com",
    password: "password123456",
    displayName: "Psychology Journal Admin",
    role: "JOURNAL_ADMIN" as const,
    journalSlug: "ajsbs",
  },
  {
    email: "editor@example.com",
    password: "password123456",
    displayName: "Psychology Reviewing Editor",
    role: "EDITOR" as const,
    journalSlug: "ajsbs",
  },
  {
    email: "author@example.com",
    password: "password123456",
    displayName: "Dr. Lead Author",
    role: "AUTHOR" as const,
  },
];

async function seedQAUsers() {
  console.log("🌱 Provisioning QA Development Access Users...");

  for (const item of USERS_TO_PROVISION) {
    const userId = await provisionDevelopmentUser(
      {
        email: item.email,
        password: item.password,
        displayName: item.displayName,
        role: item.role as GlobalRole | JournalRole,
        journalSlug: item.journalSlug,
      },
      { auth: authStore, application: applicationStore },
    );
    console.log(
      `  ✓ Provisioned ${item.email} (${item.role}) -> ID: ${userId}`,
    );
  }

  console.log("🎉 All QA Development Users Provisioned Successfully!");
}

seedQAUsers()
  .catch((err) => {
    console.error("QA User Provisioning Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
