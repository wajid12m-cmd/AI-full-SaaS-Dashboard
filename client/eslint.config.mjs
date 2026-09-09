import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // `react-hooks/set-state-in-effect` is a new, aggressive rule (added
      // in this Next.js upgrade) aimed at code that will eventually adopt
      // Suspense-based data fetching. It flags the extremely common, still
      // fully-correct "fetch on mount / on a dependency change" pattern
      // used by every dashboard page in this app (see
      // app/dashboard/*/page.tsx). Migrating all of those to
      // Suspense/`use()` or a library like SWR/React Query is a real
      // architecture change, not a lint fix — worth doing deliberately as
      // its own piece of work, not as a side effect of a security pass.
      // Downgraded to a warning so it stays visible without failing CI.
      "react-hooks/set-state-in-effect": "warn",
    },
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
