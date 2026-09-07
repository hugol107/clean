import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    // Integration tests share one Postgres connection pool and mutate real
    // rows (in their own throwaway organization) — run them serially to
    // avoid cross-test interference.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/mocks/server-only.ts"),
    },
  },
});
