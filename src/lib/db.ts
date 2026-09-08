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

function resolveConnectionString(): string {
  // Local/self-hosted Postgres (Docker Compose, Neon, Supabase, RDS...) is
  // the default -- set DATABASE_URL and it's used as-is.
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // No DATABASE_URL at all (e.g. a fresh Netlify deploy that hasn't been
  // given its own managed Postgres yet): fall back to Netlify's own
  // auto-provisioned database. getConnectionString() reads NETLIFY_DB_URL
  // through a Netlify-runtime-specific accessor when one is present, which
  // in some deployed-function contexts doesn't have this variable wired
  // through even though it's still sitting in plain process.env -- so try
  // that directly first, then the official resolver, before giving up.
  if (process.env.NETLIFY_DB_URL) return process.env.NETLIFY_DB_URL;
  try {
    return getConnectionString();
  } catch (err) {
    throw new Error(
      "No database connection available: DATABASE_URL is unset and Netlify's auto-provisioned database could not be resolved.",
      { cause: err },
    );
  }
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: resolveConnectionString(),
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
