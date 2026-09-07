import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // Only needed behind a connection pooler (Neon, Supabase's pooled port,
    // PgBouncer…) — migrations run against the direct, unpooled connection.
    directUrl: process.env.DIRECT_URL ? env("DIRECT_URL") : undefined,
  },
});
