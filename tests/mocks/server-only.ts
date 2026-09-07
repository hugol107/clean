// Test-only stub. The real `server-only` package unconditionally throws on
// import — Next.js's bundler special-cases it away for genuine server
// bundles, but that special-casing doesn't exist under Vitest/Vite, so we
// alias it to this no-op here (see vitest.config.ts). Production code is
// untouched; this file is never part of the Next.js build.
export {};
