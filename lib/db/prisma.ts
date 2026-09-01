import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: pg.Pool;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize Prisma Client.");
  }

  return databaseUrl;
}

function createPrismaClient() {
  const pool =
    globalForPrisma.pgPool ??
    new pg.Pool({
      connectionString: getDatabaseUrl(),
      max: process.env.NODE_ENV === "production" ? 2 : 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    });
  globalForPrisma.pgPool = pool;

  return new PrismaClient({
    adapter: new PrismaPg(pool),
    transactionOptions: {
      maxWait: 10_000,
      timeout: 20_000,
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
