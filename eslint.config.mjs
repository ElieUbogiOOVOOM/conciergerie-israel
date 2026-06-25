// Flat config ESLint partagée pour tout le monorepo HYMEA.
// Chaque app peut l'étendre (apps/*/eslint.config.mjs) pour ses specificités
// (Next.js, NestJS…). Prettier gère le formatage — eslint-config-prettier
// désactive ici toute règle de style en conflit.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/.next/**", "**/.turbo/**", "**/coverage/**", "**/node_modules/**"],
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
  // Fichiers de config JS à la racine : pas de projet TS strict.
  {
    files: ["**/*.config.{js,mjs,cjs}"],
    languageOptions: { sourceType: "module" },
  },
  eslintConfigPrettier,
);
