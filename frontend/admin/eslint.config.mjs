import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Fetch-on-mount (`useEffect` that sets state) and untyped legacy API rows are flagged by these two rules in a lot of older pages.
    // They stay visible as warnings and new code is expected to avoid them; everything else is still an error.
    rules: { "react-hooks/set-state-in-effect": "warn", "@typescript-eslint/no-explicit-any": "warn" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
