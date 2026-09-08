import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getConnectionString } from "@netlify/database";

// Prisma 7 requires an explicit driver adapter for SQL databases (no bundled
// engine binary anymore). We keep one PrismaClient per process, cached on
// `globalThis` in development so Next.js's module hot-reloading doesn't spin
// up a fresh connection pool on every file save.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  // Local/self-hosted Postgres (Docker Compose, Neon, Supabase, RDS...) is
  // the default -- set DATABASE_URL and it's used as-is. With no
  // DATABASE_URL at all (e.g. a fresh Netlify deploy that hasn't been given
  // its own managed Postgres yet), fall back to Netlify's own
  // auto-provisioned database rather than failing every request.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL || getConnectionString(),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
