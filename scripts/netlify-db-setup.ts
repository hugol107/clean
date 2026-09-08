// Runs as part of the Netlify build (see netlify.toml). Resolves a working
// DATABASE_URL -- the one already set (local/self-hosted Postgres) if
// present, otherwise Netlify's own auto-provisioned database -- applies
// Prisma migrations against it, and seeds demo data the first time only, so
// a fresh Netlify deploy shows up with real content instead of an empty
// database. Safe to run on every build: seeding is skipped once any
// organization already exists.
import "dotenv/config";
import { execSync } from "node:child_process";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function resolveDatabaseUrl(): Promise<string> {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { getConnectionString } = await import("@netlify/database");
  return getConnectionString();
}

async function main() {
  const databaseUrl = await resolveDatabaseUrl();
  process.env.DATABASE_URL = databaseUrl;

  console.log("Applying Prisma migrations...");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });
  const orgCount = await prisma.organization.count();
  await prisma.$disconnect();

  if (orgCount > 0) {
    console.log(`Found ${orgCount} existing organization(s) -- skipping demo seed.`);
    return;
  }

  console.log("Empty database -- seeding demo data...");
  execSync("npm run db:seed", { stdio: "inherit", env: process.env });
}

main().catch((err) => {
  console.error("netlify-db-setup failed:", err);
  process.exit(1);
});
