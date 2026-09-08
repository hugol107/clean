// Runs as part of the Netlify build (see netlify.toml), after `npm install`
// has skipped `prisma generate` (see conditional-prisma-generate.mjs)
// because no database was resolvable yet. Resolves a working DATABASE_URL --
// the one already set (local/self-hosted Postgres) if present, otherwise
// Netlify's own auto-provisioned database -- generates the Prisma client,
// applies migrations, and seeds demo data the first time only, so a fresh
// Netlify deploy shows up with real content instead of an empty database.
// Safe to run on every build: seeding is skipped once any organization
// already exists.
import "dotenv/config";
import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";

async function resolveDatabaseUrl(): Promise<string> {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { getConnectionString } = await import("@netlify/database");
  return getConnectionString();
}

async function main() {
  const databaseUrl = await resolveDatabaseUrl();
  process.env.DATABASE_URL = databaseUrl;

  console.log("Generating Prisma client...");
  execSync("npx prisma generate", { stdio: "inherit", env: process.env });

  console.log("Applying Prisma migrations...");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });

  // Deferred until after `prisma generate` has actually run above -- this
  // module may not exist on disk yet when the script starts.
  const { PrismaClient } = await import("../src/generated/prisma/client");
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
