import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import { globalIgnores } from "eslint/config";

// `eslint-config-next` (as of 15.5.x) still ships shareable configs in the
// legacy eslintrc `extends` format, not a native ESLint 9 flat-config array.
// FlatCompat is the standard bridge for consuming that format here.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
];

export default eslintConfig;
