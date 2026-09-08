// postinstall hook. `prisma generate` needs DATABASE_URL to be resolvable --
// prisma.config.ts's env("DATABASE_URL") throws immediately otherwise. That's
// true locally via .env, but not yet true on a fresh Netlify build before a
// database has been resolved (no .env file exists there, and Netlify's own
// database is resolved via a JS API call, not a pre-set env var). In that
// case, skip here -- scripts/netlify-db-setup.ts runs `prisma generate`
// itself later, once it has resolved a real connection string.
import "dotenv/config";
import { execSync } from "node:child_process";

if (process.env.DATABASE_URL) {
  execSync("prisma generate", { stdio: "inherit" });
} else {
  console.log("[postinstall] No DATABASE_URL yet -- skipping prisma generate; the build step will run it after resolving one.");
}
