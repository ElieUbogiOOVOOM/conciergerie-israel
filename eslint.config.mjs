// Flat config ESLint partagée pour tout le monorepo HYMEA.
// Chaque app peut l'étendre (apps/*/eslint.config.mjs) pour ses specificités
// (Next.js, NestJS…). Prettier gère le formatage — eslint-config-prettier
// désactive ici toute règle de style en conflit.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/node_modules/**",
      // Fichier temporaire généré par tsup pendant le build ; il peut être créé
      // puis supprimé pendant qu'ESLint parcourt les fichiers (lint et build
      // tournent en parallèle dans turbo) → ENOENT. On l'ignore.
      "**/tsup.config.bundled_*.mjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
  // apps/api (NestJS) : l'injection par décorateurs exige des imports de
  // VALEUR pour les types en position de paramètre (emitDecoratorMetadata).
  // consistent-type-imports + --fix les transformerait en imports `type` et
  // casserait la DI — on désactive la règle ici (appliqué aussi par lint-staged
  // qui s'exécute avec cette config racine).
  {
    files: ["apps/api/**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
  // Fichiers JS de config / CommonJS : globals Node (module, require, process…).
  {
    files: ["**/*.{js,cjs}", "**/*.config.{js,mjs,cjs}"],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: "commonjs",
    },
  },
  eslintConfigPrettier,
);
