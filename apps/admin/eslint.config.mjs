// ESLint pour le back-office (apps/admin). Étend la config racine du monorepo et
// ajoute les règles Next.js (core-web-vitals) via le compat FlatCompat — calqué
// sur apps/web.
import { FlatCompat } from "@eslint/eslintrc";
import rootConfig from "../../eslint.config.mjs";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...rootConfig,
  ...compat.extends("next/core-web-vitals"),
  {
    // Le parser d'eslint-config-next ne fournit pas le service de types, ce qui
    // casse la règle type-aware consistent-type-imports héritée de la racine.
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];

export default config;
